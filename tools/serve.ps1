# Local preview server for Integration Ninja.
#
# Why this exists: browsers block fetch() on file:// pages, so double-clicking
# index.html cannot load the article index. This serves the blog over
# http://localhost so it behaves exactly as it will on Hostinger. It uses only
# what ships with Windows - nothing to install.
#
# Run it from anywhere:
#     powershell -ExecutionPolicy Bypass -File tools\serve.ps1
#
# Then open http://localhost:8080  (Ctrl+C here to stop)

param(
    [int]$Port = 8080
)

$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
$prefix = "http://localhost:$Port/"

$mimeTypes = @{
    '.html' = 'text/html; charset=utf-8'
    '.css'  = 'text/css; charset=utf-8'
    '.js'   = 'text/javascript; charset=utf-8'
    '.json' = 'application/json; charset=utf-8'
    '.md'   = 'text/markdown; charset=utf-8'
    '.svg'  = 'image/svg+xml'
    '.png'  = 'image/png'
    '.jpg'  = 'image/jpeg'
    '.jpeg' = 'image/jpeg'
    '.gif'  = 'image/gif'
    '.webp' = 'image/webp'
    '.ico'  = 'image/x-icon'
    '.woff2' = 'font/woff2'
    '.txt'  = 'text/plain; charset=utf-8'
    '.xml'  = 'application/xml; charset=utf-8'
}

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add($prefix)

try {
    $listener.Start()
} catch {
    Write-Host "Could not listen on $prefix" -ForegroundColor Red
    Write-Host "Another program may be using port $Port. Try: .\tools\serve.ps1 -Port 8081" -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "  Integration Ninja is being served from:" -ForegroundColor Green
Write-Host "  $root"
Write-Host ""
Write-Host "  Open  $prefix" -ForegroundColor Cyan
Write-Host "  Stop  Ctrl+C"
Write-Host ""

try {
    while ($listener.IsListening) {
        $context = $listener.GetContext()
        $request = $context.Request
        $response = $context.Response

        # Strip the query string, decode %20 and friends, normalise slashes.
        $relative = [System.Uri]::UnescapeDataString($request.Url.AbsolutePath).TrimStart('/')
        if ([string]::IsNullOrWhiteSpace($relative)) { $relative = 'index.html' }
        $relative = $relative -replace '/', '\'

        $path = Join-Path $root $relative

        # Refuse anything that resolves outside the blog folder.
        $fullRoot = [System.IO.Path]::GetFullPath($root)
        $fullPath = $null
        try { $fullPath = [System.IO.Path]::GetFullPath($path) } catch { $fullPath = $null }

        $isSafe = $fullPath -and $fullPath.StartsWith($fullRoot, [System.StringComparison]::OrdinalIgnoreCase)

        if ($isSafe -and (Test-Path $fullPath -PathType Container)) {
            $fullPath = Join-Path $fullPath 'index.html'
        }

        if ($isSafe -and (Test-Path $fullPath -PathType Leaf)) {
            $extension = [System.IO.Path]::GetExtension($fullPath).ToLowerInvariant()
            $contentType = $mimeTypes[$extension]
            if (-not $contentType) { $contentType = 'application/octet-stream' }

            $bytes = [System.IO.File]::ReadAllBytes($fullPath)
            $response.ContentType = $contentType
            $response.ContentLength64 = $bytes.Length
            # Always revalidate, so an edited article shows up on refresh.
            $response.Headers.Add('Cache-Control', 'no-cache')
            $response.OutputStream.Write($bytes, 0, $bytes.Length)
            Write-Host ("  200  " + $request.Url.AbsolutePath) -ForegroundColor DarkGray
        } else {
            $body = [System.Text.Encoding]::UTF8.GetBytes('<h1>404</h1><p>Not found on the preview server.</p>')
            $response.StatusCode = 404
            $response.ContentType = 'text/html; charset=utf-8'
            $response.ContentLength64 = $body.Length
            $response.OutputStream.Write($body, 0, $body.Length)
            Write-Host ("  404  " + $request.Url.AbsolutePath) -ForegroundColor DarkYellow
        }

        $response.OutputStream.Close()
    }
} finally {
    $listener.Stop()
    $listener.Close()
}
