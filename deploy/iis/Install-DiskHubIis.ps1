param(
  [string]$ProjectPath = (Split-Path -Parent (Split-Path -Parent $PSScriptRoot)),
  [string]$NodeExecutable = (Get-Command node.exe -ErrorAction Stop).Source,
  [string]$RunAsUser = "$env:USERDOMAIN\$env:USERNAME",
  [int]$SitePort = 8080
)

$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'

function Quote-PowerShellArgument([string]$Value) {
  return '"' + $Value.Replace('"', '\"') + '"'
}

function Test-Administrator {
  $identity = [Security.Principal.WindowsIdentity]::GetCurrent()
  $principal = New-Object Security.Principal.WindowsPrincipal($identity)
  return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

if (-not (Test-Administrator)) {
  $arguments = @(
    '-NoProfile',
    '-ExecutionPolicy', 'Bypass',
    '-File', (Quote-PowerShellArgument $PSCommandPath),
    '-ProjectPath', (Quote-PowerShellArgument $ProjectPath),
    '-NodeExecutable', (Quote-PowerShellArgument $NodeExecutable),
    '-RunAsUser', (Quote-PowerShellArgument $RunAsUser),
    '-SitePort', $SitePort
  )
  $elevated = Start-Process `
    -FilePath (Join-Path $env:windir 'System32\WindowsPowerShell\v1.0\powershell.exe') `
    -ArgumentList ($arguments -join ' ') `
    -Verb RunAs `
    -Wait `
    -PassThru
  exit $elevated.ExitCode
}

$project = [System.IO.Path]::GetFullPath($ProjectPath)
$node = [System.IO.Path]::GetFullPath($NodeExecutable)
$siteName = 'DiskHub'
$siteHostName = 'diskHub.com'
$siteRoot = Join-Path $env:SystemDrive 'inetpub\DiskHub'
$taskName = 'DiskHub Node Server'
$firewallRuleName = 'DiskHub HTTPS from local network'
$logRoot = Join-Path $env:ProgramData 'DiskHub'
$installerLog = Join-Path $logRoot 'iis-install.log'
$rootCertificatePath = Join-Path $logRoot 'DiskHub-Local-Network-RootCA.cer'
$appcmd = Join-Path $env:windir 'System32\inetsrv\appcmd.exe'
$webConfigSource = Join-Path $PSScriptRoot 'web.config'
$runner = Join-Path $PSScriptRoot 'Run-DiskHubServer.ps1'

if ($SitePort -lt 1024 -or $SitePort -gt 65535) {
  throw 'SitePort must be between 1024 and 65535.'
}
if (-not (Test-Path (Join-Path $project 'dist\index.html'))) {
  throw 'Production files were not found. Run npm run build from the project folder first.'
}
if (-not (Test-Path $node) -or -not (Test-Path $webConfigSource) -or -not (Test-Path $runner)) {
  throw 'The Node.js executable or IIS deployment files could not be found.'
}

New-Item -Path $logRoot -ItemType Directory -Force | Out-Null
Start-Transcript -Path $installerLog -Append | Out-Null

try {
  $features = @(
    'IIS-WebServerRole',
    'IIS-WebServer',
    'IIS-CommonHttpFeatures',
    'IIS-StaticContent',
    'IIS-DefaultDocument',
    'IIS-HttpErrors',
    'IIS-WebServerManagementTools',
    'IIS-ManagementConsole'
  )

  foreach ($feature in $features) {
    $state = Get-WindowsOptionalFeature -Online -FeatureName $feature
    if ($state.State -ne 'Enabled') {
      Write-Output "Enabling Windows feature $feature."
      Enable-WindowsOptionalFeature -Online -FeatureName $feature -All -NoRestart | Out-Null
    }
  }

  $installerDirectory = Join-Path $env:TEMP ("DiskHub-IIS-" + [guid]::NewGuid().ToString('N'))
  New-Item -Path $installerDirectory -ItemType Directory -Force | Out-Null

  try {
    $modules = @(
      @{
        Name = 'IIS URL Rewrite'
        Path = Join-Path $env:windir 'System32\inetsrv\rewrite.dll'
        Url = 'https://download.microsoft.com/download/1/2/8/128E2E22-C1B9-44A4-BE2A-5859ED1D4592/rewrite_amd64_en-US.msi'
        File = 'rewrite_amd64_en-US.msi'
      },
      @{
        Name = 'IIS Application Request Routing'
        Path = Join-Path $env:ProgramFiles 'IIS\Application Request Routing\requestRouter.dll'
        Url = 'https://download.microsoft.com/download/E/9/8/E9849D6A-020E-47E4-9FD0-A023E99B54EB/requestRouter_amd64.msi'
        File = 'requestRouter_amd64.msi'
      }
    )

    foreach ($module in $modules) {
      if (Test-Path $module.Path) {
        Write-Output "$($module.Name) is already installed."
        continue
      }

      $installerPath = Join-Path $installerDirectory $module.File
      Write-Output "Downloading $($module.Name) from its official Microsoft download."
      Invoke-WebRequest -Uri $module.Url -OutFile $installerPath -UseBasicParsing

      $signature = Get-AuthenticodeSignature -FilePath $installerPath
      if ($signature.Status -ne 'Valid' -or $signature.SignerCertificate.Subject -notmatch 'Microsoft Corporation') {
        throw "The downloaded $($module.Name) installer does not have a valid Microsoft signature."
      }

      $moduleLog = Join-Path $logRoot ($module.File + '.log')
      $installation = Start-Process `
        -FilePath (Join-Path $env:windir 'System32\msiexec.exe') `
        -ArgumentList @('/i', "`"$installerPath`"", '/qn', '/norestart', '/L*v', "`"$moduleLog`"") `
        -Wait `
        -PassThru
      if ($installation.ExitCode -notin @(0, 3010)) {
        throw "$($module.Name) setup failed with exit code $($installation.ExitCode). See $moduleLog."
      }
      if (-not (Test-Path $module.Path)) {
        throw "$($module.Name) did not install its IIS module at the expected path."
      }
    }
  } finally {
    Remove-Item -LiteralPath $installerDirectory -Recurse -Force -ErrorAction SilentlyContinue
  }

  Import-Module WebAdministration
  Set-Service -Name WAS -StartupType Automatic
  Set-Service -Name W3SVC -StartupType Automatic
  Start-Service -Name WAS
  Start-Service -Name W3SVC

  $expectedBinding = "*:${SitePort}:localhost"
  $existingSite = Get-Website -Name $siteName -ErrorAction SilentlyContinue
  if ($existingSite) {
    $siteBindings = @(Get-WebBinding -Name $siteName)
    $existingBinding = $siteBindings | Where-Object {
      $_.bindingInformation -eq $expectedBinding -and $_.protocol -eq 'http'
    }
    if (-not $existingBinding -or $existingSite.ApplicationPool -ne $siteName) {
      $bindingSummary = ($siteBindings | ForEach-Object { "$($_.protocol) $($_.bindingInformation)" }) -join ', '
      throw "An unrelated IIS site named $siteName exists (bindings: $bindingSummary; application pool: $($existingSite.ApplicationPool)). The existing site was left unchanged."
    }
    if ([System.IO.Path]::GetFullPath($existingSite.PhysicalPath) -ne [System.IO.Path]::GetFullPath($siteRoot)) {
      throw "The existing IIS site $siteName points to a different folder. It was left unchanged."
    }
  } else {
    if (Test-Path "IIS:\AppPools\$siteName") {
      throw "An unrelated IIS application pool named $siteName exists. The existing pool was left unchanged."
    }
    $portBinding = Get-WebBinding | Where-Object {
      $_.bindingInformation -match ("^\*:" + $SitePort + ':')
    }
    if ($portBinding) {
      throw "IIS port $SitePort is already assigned to an existing site. The existing binding was left unchanged."
    }
  }
  if (
    -not $existingSite -and
    (Get-NetTCPConnection -State Listen -LocalPort $SitePort -ErrorAction SilentlyContinue)
  ) {
    throw "TCP port $SitePort is already in use. The existing service was left unchanged."
  }
  $sslBindings = foreach ($site in Get-Website) {
    foreach ($binding in Get-WebBinding -Name $site.Name -Protocol https) {
      [pscustomobject]@{
        SiteName = $site.Name
        BindingInformation = $binding.bindingInformation
      }
    }
  }
  $conflictingSslBinding = $sslBindings | Where-Object {
    $_.SiteName -ne $siteName -and
    (
      $_.BindingInformation -eq "*:443:$siteHostName" -or
      $_.BindingInformation -eq '*:443:'
    )
  }
  if ($conflictingSslBinding) {
    throw "HTTPS port 443 is already bound by IIS site '$($conflictingSslBinding.SiteName)'. The existing binding was left unchanged."
  }
  $otherPort443Listener = Get-NetTCPConnection -State Listen -LocalPort 443 -ErrorAction SilentlyContinue |
    Where-Object { $_.OwningProcess -ne 4 } |
    Select-Object -First 1
  if ($otherPort443Listener) {
    throw "TCP port 443 is already in use by process $($otherPort443Listener.OwningProcess). The existing service was left unchanged."
  }
  $existingTask = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
  if ($existingTask) {
    $taskAction = $existingTask.Actions | Select-Object -First 1
    $expectedUserSid = [System.Security.Principal.NTAccount]::new($RunAsUser).Translate(
      [System.Security.Principal.SecurityIdentifier]
    ).Value
    $existingUserSid = [System.Security.Principal.NTAccount]::new($existingTask.Principal.UserId).Translate(
      [System.Security.Principal.SecurityIdentifier]
    ).Value
    if (
      $existingUserSid -ne $expectedUserSid -or
      $taskAction.Execute -ne (Join-Path $env:windir 'System32\WindowsPowerShell\v1.0\powershell.exe') -or
      $taskAction.Arguments -notmatch [regex]::Escape($runner)
    ) {
      throw "An unrelated scheduled task named '$taskName' exists. The existing task was left unchanged."
    }
  }

  $serverProcess = Get-NetTCPConnection -State Listen -LocalPort 3001 -ErrorAction SilentlyContinue |
    Select-Object -First 1
  if ($serverProcess) {
    $owner = Get-CimInstance Win32_Process -Filter "ProcessId = $($serverProcess.OwningProcess)"
    $apiResponse = $null
    try {
      $apiResponse = Invoke-WebRequest -Uri 'http://127.0.0.1:3001/api/auth/me' -UseBasicParsing -TimeoutSec 3
    } catch {
      throw 'Port 3001 is in use by an unverified process. It was left running.'
    }
    if (
      $owner.ExecutablePath -ne $node -or
      $owner.CommandLine -notmatch 'server\.js' -or
      $apiResponse.StatusCode -ne 200
    ) {
      throw 'Port 3001 is not owned by the expected DiskHub Node server. The existing process was left running.'
    }
    if ($existingTask -and $existingTask.State -eq 'Running') {
      Stop-ScheduledTask -TaskName $taskName
    }
    Stop-Process -Id $owner.ProcessId -ErrorAction Stop
    for ($attempt = 0; $attempt -lt 40; $attempt++) {
      if (-not (Get-NetTCPConnection -State Listen -LocalPort 3001 -ErrorAction SilentlyContinue)) {
        break
      }
      Start-Sleep -Milliseconds 250
    }
    if (Get-NetTCPConnection -State Listen -LocalPort 3001 -ErrorAction SilentlyContinue) {
      throw 'The existing DiskHub Node server did not stop in time.'
    }
  }

  New-Item -Path $siteRoot -ItemType Directory -Force | Out-Null
  Copy-Item -Path (Join-Path $project 'dist\*') -Destination $siteRoot -Recurse -Force
  Copy-Item -LiteralPath $webConfigSource -Destination (Join-Path $siteRoot 'web.config') -Force
  & (Join-Path $env:windir 'System32\icacls.exe') $siteRoot /grant 'IIS_IUSRS:(OI)(CI)(RX)' /T /C | Out-Null
  if ($LASTEXITCODE -ne 0) {
    throw "Could not grant IIS read access to $siteRoot."
  }

  $rootSubject = 'CN=DiskHub Local Network Root CA'
  $rootCertificate = Get-ChildItem Cert:\LocalMachine\My |
    Where-Object {
      $_.Subject -eq $rootSubject -and
      $_.HasPrivateKey -and
      $_.NotAfter -gt (Get-Date).AddYears(2).AddDays(30)
    } |
    Sort-Object NotAfter -Descending |
    Select-Object -First 1
  if (-not $rootCertificate) {
    $rootCertificate = New-SelfSignedCertificate `
      -Type Custom `
      -Subject $rootSubject `
      -KeyAlgorithm RSA `
      -KeyLength 3072 `
      -HashAlgorithm SHA256 `
      -KeyUsage CertSign, CRLSign, DigitalSignature `
      -KeyExportPolicy NonExportable `
      -CertStoreLocation Cert:\LocalMachine\My `
      -NotAfter (Get-Date).AddYears(10) `
      -TextExtension @('2.5.29.19={critical}{text}ca=TRUE&pathlength=0')
  }
  Export-Certificate -Cert $rootCertificate -FilePath $rootCertificatePath -Force | Out-Null
  if (-not (Test-Path "Cert:\LocalMachine\Root\$($rootCertificate.Thumbprint)")) {
    Import-Certificate -FilePath $rootCertificatePath -CertStoreLocation Cert:\LocalMachine\Root | Out-Null
  }

  $serverCertificate = Get-ChildItem Cert:\LocalMachine\My |
    Where-Object {
      $_.Subject -eq "CN=$siteHostName" -and
      $_.Issuer -eq $rootCertificate.Subject -and
      $_.HasPrivateKey -and
      $_.NotAfter -gt (Get-Date).AddDays(30) -and
      ($_.DnsNameList | Where-Object { $_.Unicode -ieq $siteHostName })
    } |
    Sort-Object NotAfter -Descending |
    Select-Object -First 1
  if (-not $serverCertificate) {
    $serverCertificate = New-SelfSignedCertificate `
      -Type Custom `
      -Subject "CN=$siteHostName" `
      -DnsName $siteHostName `
      -Signer $rootCertificate `
      -KeyAlgorithm RSA `
      -KeyLength 2048 `
      -HashAlgorithm SHA256 `
      -KeyUsage DigitalSignature, KeyEncipherment `
      -CertStoreLocation Cert:\LocalMachine\My `
      -NotAfter (Get-Date).AddYears(2) `
      -TextExtension @('2.5.29.37={text}1.3.6.1.5.5.7.3.1')
  }
  $certificateChain = New-Object System.Security.Cryptography.X509Certificates.X509Chain
  $certificateChain.ChainPolicy.RevocationMode = [System.Security.Cryptography.X509Certificates.X509RevocationMode]::NoCheck
  if (-not $certificateChain.Build($serverCertificate)) {
    $chainStatus = ($certificateChain.ChainStatus | ForEach-Object { $_.StatusInformation.Trim() }) -join '; '
    throw "The local HTTPS certificate chain is invalid: $chainStatus"
  }

  if (-not $existingSite) {
    New-WebAppPool -Name $siteName | Out-Null
    Set-ItemProperty "IIS:\AppPools\$siteName" -Name managedRuntimeVersion -Value ''
    Set-ItemProperty "IIS:\AppPools\$siteName" -Name processModel.identityType -Value ApplicationPoolIdentity
    New-Website -Name $siteName -PhysicalPath $siteRoot -Port $SitePort -HostHeader localhost -ApplicationPool $siteName | Out-Null
  }

  $httpsBinding = Get-WebBinding -Name $siteName -Protocol https | Where-Object {
    $_.bindingInformation -eq "*:443:$siteHostName"
  } | Select-Object -First 1
  if (-not $httpsBinding) {
    New-WebBinding -Name $siteName -Protocol https -Port 443 -HostHeader $siteHostName -SslFlags 1 | Out-Null
    $httpsBinding = Get-WebBinding -Name $siteName -Protocol https | Where-Object {
      $_.bindingInformation -eq "*:443:$siteHostName"
    } | Select-Object -First 1
  }
  if (-not $httpsBinding) {
    throw "Could not create the HTTPS binding for $siteHostName."
  }
  if ($httpsBinding.certificateHash) {
    $httpsBinding.RemoveSslCertificate()
  }
  $httpsBinding.AddSslCertificate($serverCertificate.Thumbprint, 'My')

  $firewallRule = Get-NetFirewallRule -DisplayName $firewallRuleName -ErrorAction SilentlyContinue
  if ($firewallRule) {
    $firewallPortFilter = $firewallRule | Get-NetFirewallPortFilter
    $firewallAddressFilter = $firewallRule | Get-NetFirewallAddressFilter
    if (
      $firewallRule.Enabled -ne 'True' -or
      $firewallRule.Direction -ne 'Inbound' -or
      $firewallRule.Action -ne 'Allow' -or
      $firewallRule.Profile -notcontains 'Any' -or
      $firewallPortFilter.Protocol -ne 'TCP' -or
      $firewallPortFilter.LocalPort -notcontains '443' -or
      $firewallAddressFilter.RemoteAddress -notcontains 'LocalSubnet'
    ) {
      throw "A firewall rule named '$firewallRuleName' already exists with different settings. It was left unchanged."
    }
  } else {
    New-NetFirewallRule `
      -DisplayName $firewallRuleName `
      -Direction Inbound `
      -Protocol TCP `
      -LocalPort 443 `
      -RemoteAddress LocalSubnet `
      -Profile Any `
      -Action Allow | Out-Null
  }

  & $appcmd set config -section:system.webServer/proxy /enabled:true /preserveHostHeader:true /timeout:00:30:00 /commit:apphost
  if ($LASTEXITCODE -ne 0) {
    throw 'IIS ARR could not be enabled as a reverse proxy.'
  }

  $actionArguments = @(
    '-NoProfile',
    '-ExecutionPolicy', 'Bypass',
    '-WindowStyle', 'Hidden',
    '-File', (Quote-PowerShellArgument $runner),
    '-ProjectPath', (Quote-PowerShellArgument $project),
    '-NodeExecutable', (Quote-PowerShellArgument $node)
  ) -join ' '
  $action = New-ScheduledTaskAction `
    -Execute (Join-Path $env:windir 'System32\WindowsPowerShell\v1.0\powershell.exe') `
    -Argument $actionArguments
  $trigger = New-ScheduledTaskTrigger -AtLogOn -User $RunAsUser
  $principal = New-ScheduledTaskPrincipal -UserId $RunAsUser -LogonType Interactive -RunLevel Limited
  $settings = New-ScheduledTaskSettingsSet `
    -StartWhenAvailable `
    -RestartCount 5 `
    -RestartInterval (New-TimeSpan -Minutes 1) `
    -MultipleInstances IgnoreNew `
    -ExecutionTimeLimit ([TimeSpan]::Zero) `
    -Hidden
  if ($existingTask) {
    Unregister-ScheduledTask -TaskName $taskName -Confirm:$false
  }
  Register-ScheduledTask `
    -TaskName $taskName `
    -Action $action `
    -Trigger $trigger `
    -Principal $principal `
    -Settings $settings `
    -Description 'Runs the DiskHub Node.js API for the local IIS site.' | Out-Null
  Start-ScheduledTask -TaskName $taskName

  $healthy = $false
  for ($attempt = 0; $attempt -lt 60; $attempt++) {
    try {
      $health = Invoke-RestMethod -Uri 'http://127.0.0.1:3001/api/health' -TimeoutSec 2
      if ($health.status -eq 'ok') {
        $healthy = $true
        break
      }
    } catch {
      Start-Sleep -Seconds 1
    }
  }
  if (-not $healthy) {
    $task = Get-ScheduledTask -TaskName $taskName
    if ($task.State -eq 'Running') {
      Stop-ScheduledTask -TaskName $taskName
    }
    throw 'DiskHub did not become healthy. Inspect data\server-error.log and the IIS installation log.'
  }

  $site = Get-Website -Name $siteName
  if ($site.State -ne 'Started') {
    Start-Website -Name $siteName
  }

  $siteResponse = Invoke-WebRequest -Uri "http://localhost:$SitePort/" -UseBasicParsing -TimeoutSec 10
  if ($siteResponse.StatusCode -ne 200 -or $siteResponse.Content -notmatch 'DiskHub') {
    throw 'The IIS site did not return the DiskHub application page.'
  }
  $proxyResponse = Invoke-WebRequest -Uri "http://localhost:$SitePort/api/auth/me" -UseBasicParsing -TimeoutSec 10
  if ($proxyResponse.StatusCode -ne 200) {
    throw 'The IIS-to-Node API proxy did not return a successful response.'
  }
  $curl = Get-Command curl.exe -ErrorAction Stop
  $httpsHealth = & $curl.Source `
    --resolve "${siteHostName}:443:127.0.0.1" `
    --ssl-no-revoke `
    --fail `
    --silent `
    --show-error `
    "https://$siteHostName/api/health"
  if ($LASTEXITCODE -ne 0 -or ($httpsHealth | ConvertFrom-Json).status -ne 'ok') {
    throw 'The HTTPS IIS-to-Node API proxy did not return a healthy response.'
  }
  $httpsPage = & $curl.Source `
    --resolve "${siteHostName}:443:127.0.0.1" `
    --ssl-no-revoke `
    --fail `
    --silent `
    --show-error `
    "https://$siteHostName/"
  if ($LASTEXITCODE -ne 0 -or ($httpsPage -join "`n") -notmatch '<title>DiskHub') {
    throw 'The HTTPS IIS site did not return the DiskHub application page.'
  }

  Write-Output "DiskHub is published locally at http://localhost:$SitePort/ and https://$siteHostName/."
  Write-Output "Configure your LAN DNS to resolve $siteHostName to this server's LAN IP address."
  $lanAddresses = Get-NetIPAddress -AddressFamily IPv4 -AddressState Preferred |
    Where-Object {
      $_.IPAddress -match '^(10\.|192\.168\.|172\.(1[6-9]|2[0-9]|3[01])\.)'
    } |
    ForEach-Object { "$($_.InterfaceAlias): $($_.IPAddress)" }
  if ($lanAddresses) {
    Write-Output "Private IPv4 addresses (choose the LAN adapter for your DNS entry): $($lanAddresses -join '; ')"
  }
  Write-Output "Install this root certificate on each client: $rootCertificatePath"
  Write-Output "The IIS site serves static files from $siteRoot."
  Write-Output "The Node API is listening only on 127.0.0.1:3001."
  Write-Output "The Node server starts automatically when $RunAsUser signs in."
  Write-Output "IIS setup log: $installerLog"
} catch {
  Write-Error -ErrorRecord $_
  throw
} finally {
  Stop-Transcript | Out-Null
}
