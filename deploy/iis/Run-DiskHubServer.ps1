param(
  [Parameter(Mandatory = $true)]
  [string]$ProjectPath,

  [Parameter(Mandatory = $true)]
  [string]$NodeExecutable
)

$ErrorActionPreference = 'Stop'
$project = [System.IO.Path]::GetFullPath($ProjectPath)
$node = [System.IO.Path]::GetFullPath($NodeExecutable)
$dataPath = Join-Path $project 'data'

New-Item -Path $dataPath -ItemType Directory -Force | Out-Null

$process = Start-Process `
  -FilePath $node `
  -ArgumentList 'server.js' `
  -WorkingDirectory $project `
  -PassThru `
  -Wait `
  -WindowStyle Hidden `
  -RedirectStandardOutput (Join-Path $dataPath 'server.log') `
  -RedirectStandardError (Join-Path $dataPath 'server-error.log')

exit $process.ExitCode
