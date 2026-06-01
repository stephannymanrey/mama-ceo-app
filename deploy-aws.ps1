param(
  [string]$Bucket = $env:AWS_S3_BUCKET,
  [string]$DistributionId = $env:AWS_CLOUDFRONT_DISTRIBUTION_ID,
  [string]$AwsProfile = $env:AWS_PROFILE
)

if (-not (Get-Command aws -ErrorAction SilentlyContinue)) {
  Write-Error "AWS CLI no está instalado. Instálalo desde https://aws.amazon.com/cli/"
  exit 1
}

if (-not $Bucket) {
  Write-Error "Debes definir la variable de entorno AWS_S3_BUCKET con el nombre del bucket S3 donde desplegar."
  exit 1
}

Write-Host "Construyendo la aplicación..." -ForegroundColor Cyan
npm run build
if ($LASTEXITCODE -ne 0) {
  Write-Error "La compilación falló. Corrige los errores y vuelve a ejecutar."
  exit 1
}

Write-Host "Sincronizando ./dist con s3://$Bucket ..." -ForegroundColor Cyan
$syncArgs = @("s3", "sync", "./dist", "s3://$Bucket", "--delete", "--acl", "public-read", "--cache-control", "max-age=3600,public")
if ($AwsProfile) { $syncArgs += @("--profile", $AwsProfile) }
aws @syncArgs
if ($LASTEXITCODE -ne 0) {
  Write-Error "La sincronización con S3 falló."
  exit 1
}

if ($DistributionId) {
  Write-Host "Invalidando cache de CloudFront ($DistributionId)..." -ForegroundColor Cyan
  $invArgs = @("cloudfront", "create-invalidation", "--distribution-id", $DistributionId, "--paths", "/*")
  if ($AwsProfile) { $invArgs += @("--profile", $AwsProfile) }
  aws @invArgs
  if ($LASTEXITCODE -ne 0) {
    Write-Warning "No se pudo invalidar CloudFront. Verifica el Distribution ID o tus permisos."
  }
}

Write-Host "Despliegue AWS completado." -ForegroundColor Green
