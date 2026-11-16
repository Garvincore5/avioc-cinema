using System;
using System.Diagnostics;
using System.IO;
using System.Net;
using System.Runtime.InteropServices;
using System.Reflection;
using System.Text;
using System.Threading.Tasks;

namespace AiCompanion
{
    class Program
    {
        private const int Port = 5000;
        private static HttpListener? _listener;

        static async Task Main(string[] args)
        {
            Console.Title = "J.A.R.V.I.S. Core Neural Engine";
            Console.ForegroundColor = ConsoleColor.Cyan;

            Console.WriteLine(@"
    ========================================================================
     ██╗ █████╗ ██████╗ ██╗   ██╗██╗███████╗
     ██║██╔══██╗██╔══██╗██║   ██║██║██╔════╝
     ██║███████║██████╔╝██║   ██║██║███████╗
██   ██║██╔══██║██╔══██╗╚██╗ ██╔╝██║╚════██║
╚█████╔╝██║  ██║██║  ██║ ╚████╔╝ ██║███████║
 ╚════╝ ╚═╝  ╚═╝╚═╝  ╚═╝  ╚═══╝  ╚═╝╚══════╝
       [ AUTONOMOUS DESKTOP AI COMPANION ]
    ========================================================================");
            Console.ResetColor();

            string appDir = AppDomain.CurrentDomain.BaseDirectory;
            string srcDir = Path.Combine(appDir, "src");

            // Fallback to project source dir if running from bin directory
            if (!Directory.Exists(srcDir))
            {
                srcDir = Path.Combine(Directory.GetCurrentDirectory(), "src");
            }

            Console.WriteLine($"\n[*] Initializing Neural Core on: http://localhost:{Port}/");
            Console.WriteLine($"[*] Serving interface assets from: {srcDir}");

            try
            {
                _listener = new HttpListener();
                _listener.Prefixes.Add($"http://localhost:{Port}/");
                _listener.Start();

                Console.ForegroundColor = ConsoleColor.Green;
                Console.WriteLine("[+] Neural Engine Online. Launching Interface Window...\n");
                Console.ResetColor();

                // Open in app mode with Edge/Chrome or default browser
                LaunchDesktopWindow($"http://localhost:{Port}/");

                _ = Task.Run(() => HandleIncomingRequests(srcDir));

                Console.ForegroundColor = ConsoleColor.DarkGray;
                Console.WriteLine("[!] Press Ctrl+C in this console to terminate the engine.\n");
                Console.ResetColor();

                var tcs = new TaskCompletionSource();
                Console.CancelKeyPress += (s, e) => {
                    e.Cancel = true;
                    _listener.Stop();
                    tcs.SetResult();
                };

                await tcs.Task;
            }
            catch (Exception ex)
            {
                Console.ForegroundColor = ConsoleColor.Red;
                Console.WriteLine($"[-] Error starting engine: {ex.Message}");
                Console.ResetColor();
            }
        }

        private static async Task HandleIncomingRequests(string srcDir)
        {
            while (_listener != null && _listener.IsListening)
            {
                try
                {
                    var context = await _listener.GetContextAsync();
                    _ = Task.Run(() => ProcessRequest(context, srcDir));
                }
                catch
                {
                    break;
                }
            }
        }

        private static void ProcessRequest(HttpListenerContext context, string srcDir)
        {
            var req = context.Request;
            var res = context.Response;

            string rawPath = req.Url?.AbsolutePath.TrimStart('/') ?? "";
            if (string.IsNullOrEmpty(rawPath)) rawPath = "index.html";

            string safeRoot = Path.GetFullPath(srcDir).TrimEnd(Path.DirectorySeparatorChar) + Path.DirectorySeparatorChar;
            string filePath = Path.GetFullPath(Path.Combine(srcDir, rawPath.Replace('/', Path.DirectorySeparatorChar)));
            bool isInsideWebRoot = filePath.StartsWith(safeRoot, StringComparison.OrdinalIgnoreCase);

            // CORS headers
            res.Headers.Add("Access-Control-Allow-Origin", "*");
            res.Headers.Add("Access-Control-Allow-Methods", "GET, POST, OPTIONS");

            if (req.HttpMethod == "OPTIONS")
            {
                res.StatusCode = 200;
                res.Close();
                return;
            }

            // System info API
            if (rawPath.Equals("api/stats", StringComparison.OrdinalIgnoreCase))
            {
                using var proc = Process.GetCurrentProcess();
                long memUsedMb = proc.WorkingSet64 / (1024 * 1024);
                string json = $"{{\"status\":\"nominal\",\"memoryUsageMb\":{memUsedMb},\"cores\":{Environment.ProcessorCount},\"machineName\":\"{Environment.MachineName}\"}}";
                byte[] jsonBytes = Encoding.UTF8.GetBytes(json);
                res.ContentType = "application/json";
                res.ContentLength64 = jsonBytes.Length;
                res.OutputStream.Write(jsonBytes, 0, jsonBytes.Length);
                res.Close();
                return;
            }

            byte[]? assetBytes = null;
            if (isInsideWebRoot && File.Exists(filePath))
            {
                assetBytes = File.ReadAllBytes(filePath);
            }
            else if (!rawPath.Contains("..", StringComparison.Ordinal))
            {
                string resourceName = "JarvisDesktop.Web." + rawPath.Replace('/', '.');
                using Stream? resource = Assembly.GetExecutingAssembly().GetManifestResourceStream(resourceName);
                if (resource != null)
                {
                    using var buffer = new MemoryStream();
                    resource.CopyTo(buffer);
                    assetBytes = buffer.ToArray();
                }
            }

            if (assetBytes != null)
            {
                res.ContentType = GetContentType(rawPath);
                res.ContentLength64 = assetBytes.Length;
                res.OutputStream.Write(assetBytes, 0, assetBytes.Length);
                res.Close();
            }
            else
            {
                res.StatusCode = 404;
                byte[] err = Encoding.UTF8.GetBytes("404 - Asset Not Found");
                res.OutputStream.Write(err, 0, err.Length);
                res.Close();
            }
        }

        private static string GetContentType(string path)
        {
            string ext = Path.GetExtension(path).ToLowerInvariant();
            return ext switch
            {
                ".html" => "text/html; charset=utf-8",
                ".css" => "text/css; charset=utf-8",
                ".js" => "application/javascript; charset=utf-8",
                ".json" => "application/json; charset=utf-8",
                ".svg" => "image/svg+xml",
                ".png" => "image/png",
                ".jpg" => "image/jpeg",
                ".ico" => "image/x-icon",
                _ => "application/octet-stream"
            };
        }

        private static void LaunchDesktopWindow(string url)
        {
            try
            {
                // Try launching Microsoft Edge in standalone app window mode for that true native movie HUD look
                Process.Start(new ProcessStartInfo
                {
                    FileName = "msedge.exe",
                    Arguments = $"--app=\"{url}\" --window-size=1200,800",
                    UseShellExecute = true
                });
            }
            catch
            {
                try
                {
                    // Fallback to default browser
                    Process.Start(new ProcessStartInfo
                    {
                        FileName = url,
                        UseShellExecute = true
                    });
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"[*] Note: Open {url} manually in your browser. ({ex.Message})");
                }
            }
        }
    }
}
