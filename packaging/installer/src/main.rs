#![windows_subsystem = "windows"]

use std::env;
use std::fs;
use std::io::{Read, Write};
use std::mem;
use std::net::{TcpListener, TcpStream};
use std::path::{Path, PathBuf};
use std::process::{Command, Stdio};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Mutex, OnceLock};

static CANCELLED: AtomicBool = AtomicBool::new(false);
static CUSTOM_DIR: OnceLock<Mutex<PathBuf>> = OnceLock::new();

fn is_cancelled() -> bool {
    CANCELLED.load(Ordering::Relaxed)
}

fn set_custom_dir(p: PathBuf) {
    if let Ok(mut l) = custom_dir_lock().lock() {
        *l = p;
    }
}

fn custom_dir_lock() -> &'static Mutex<PathBuf> {
    CUSTOM_DIR.get_or_init(|| Mutex::new(app_dir()))
}

fn get_effective_install_dir() -> PathBuf {
    if let Ok(l) = custom_dir_lock().lock() {
        l.clone()
    } else {
        app_dir()
    }
}
use std::thread;
use std::time::Duration;

use tao::dpi::{LogicalSize, PhysicalPosition};
use tao::event::{Event, WindowEvent};
use tao::event_loop::{ControlFlow, EventLoopBuilder, EventLoopProxy};
use tao::window::{Icon, WindowBuilder};
use wry::WebViewBuilder;

const PAGE: &str = include_str!("../../installer.html");
const LOGO_SVG: &str = include_str!("../../assets/logo.svg");
const LOGO_PNG: &[u8] = include_bytes!("../../assets/logo256.png");
const ICON_RGBA: &[u8] = include_bytes!("../../assets/icon64.rgba");
const ENGINE: &[u8] = include_bytes!(r"..\..\..\release\engine\catalyst-engine.exe");
const DEFAULT_PORT: u16 = 39871;

#[repr(C)]
struct MemoryStatusEx {
    length: u32,
    memory_load: u32,
    total_phys: u64,
    avail_phys: u64,
    total_page_file: u64,
    avail_page_file: u64,
    total_virtual: u64,
    avail_virtual: u64,
    avail_extended_virtual: u64,
}

extern "system" {
    fn GlobalMemoryStatusEx(status: *mut MemoryStatusEx) -> i32;
}

#[derive(Clone, Debug)]
struct SystemHardware {
    total_ram_gb: f32,
    avail_ram_gb: f32,
    cpu_cores: usize,
    recommended_profile: String,
}

fn get_system_hardware() -> SystemHardware {
    let mut status: MemoryStatusEx = unsafe { mem::zeroed() };
    status.length = mem::size_of::<MemoryStatusEx>() as u32;
    let (total_ram_gb, avail_ram_gb) = unsafe {
        if GlobalMemoryStatusEx(&mut status) != 0 {
            (
                status.total_phys as f32 / (1024.0 * 1024.0 * 1024.0),
                status.avail_phys as f32 / (1024.0 * 1024.0 * 1024.0),
            )
        } else {
            (8.0, 4.0)
        }
    };

    let cpu_cores = thread::available_parallelism()
        .map(|n| n.get())
        .unwrap_or(4);

    let recommended_profile = if total_ram_gb >= 11.5 && cpu_cores >= 6 {
        "complete".to_string()
    } else if total_ram_gb >= 5.5 {
        "recommended".to_string()
    } else {
        "essential".to_string()
    };

    SystemHardware {
        total_ram_gb,
        avail_ram_gb,
        cpu_cores,
        recommended_profile,
    }
}

struct InstallState {
    stage: String,
    detail: String,
    progress: f32,
    done: bool,
    error: bool,
}

static STATE: OnceLock<Mutex<InstallState>> = OnceLock::new();
static PROXY: OnceLock<Mutex<EventLoopProxy<Ui>>> = OnceLock::new();

fn state() -> &'static Mutex<InstallState> {
    STATE.get_or_init(|| {
        Mutex::new(InstallState {
            stage: "Ready".into(),
            detail: String::new(),
            progress: 0.0,
            done: false,
            error: false,
        })
    })
}

fn send_ui(event: Ui) {
    if let Some(lock) = PROXY.get() {
        if let Ok(proxy) = lock.lock() {
            let _ = proxy.send_event(event);
        }
    }
}

fn update(stage: &str, detail: &str, progress: f32) {
    let mut value = state().lock().unwrap();
    value.stage = stage.into();
    value.detail = detail.into();
    value.progress = progress;
}

fn json_escape(value: &str) -> String {
    value
        .replace('\\', "\\\\")
        .replace('"', "\\\"")
        .replace('\n', " ")
        .replace('\r', "")
}

fn app_dir() -> PathBuf {
    let base = env::var("LOCALAPPDATA").unwrap_or_else(|_| ".".into());
    Path::new(&base).join("Catalyst")
}

fn choose_folder_dialog() -> Option<PathBuf> {
    let script = "$app = New-Object -ComObject Shell.Application; $f = $app.BrowseForFolder(0, 'Select Catalyst Installation Folder', 0, 0); if ($f) { $f.Self.Path }";
    let output = Command::new("powershell.exe")
        .args(["-NoProfile", "-Command", script])
        .creation_flags(0x08000000)
        .output()
        .ok()?;
    let path_str = String::from_utf8_lossy(&output.stdout).trim().to_string();
    if !path_str.is_empty() {
        Some(PathBuf::from(path_str))
    } else {
        None
    }
}

fn cleanup_install(root: &Path) {
    let _ = fs::remove_file(root.join("Catalyst.exe"));
    let _ = fs::remove_file(root.join("catalyst.ico"));
    let _ = fs::remove_file(root.join("Catalyst.lnk"));
    if let Ok(profile_dir) = env::var("USERPROFILE") {
        let d = Path::new(&profile_dir).join("Desktop").join("Catalyst.lnk");
        let _ = fs::remove_file(d);
    }
    // Also remove incomplete download files
    if let Ok(entries) = fs::read_dir(root.join("models")) {
        for e in entries.flatten() {
            if let Some(ext) = e.path().extension() {
                if ext == "download" {
                    let _ = fs::remove_file(e.path());
                }
            }
        }
    }
}

fn try_seed_existing_model(file_name: &str, destination: &Path, expected: u64) -> bool {
    if destination
        .metadata()
        .map(|m| m.len() > expected * 9 / 10)
        .unwrap_or(false)
    {
        return true;
    }

    let mut candidates = Vec::new();
    if let Ok(exe) = env::current_exe() {
        if let Some(dir) = exe.parent() {
            candidates.push(dir.join("models").join(file_name));
            if let Some(p1) = dir.parent() {
                candidates.push(p1.join("models").join(file_name));
                if let Some(p2) = p1.parent() {
                    candidates.push(p2.join("models").join(file_name));
                }
            }
        }
    }
    candidates.push(PathBuf::from(r"D:\Catalyst\models").join(file_name));

    // Also accept 1.1 filename for Apex 1.2 if present
    if file_name.contains("apex") {
        candidates.push(PathBuf::from(r"D:\Catalyst\models\catalyst-apex-1.1-q4_k_m.gguf"));
    }

    for src in candidates {
        if src != destination
            && src
                .metadata()
                .map(|m| m.len() > expected * 9 / 10)
                .unwrap_or(false)
        {
            if fs::copy(&src, destination).is_ok() {
                return true;
            }
        }
    }
    false
}

fn ps_quote(value: &Path) -> String {
    format!("'{}'", value.display().to_string().replace('\'', "''"))
}

fn download(
    url: &str,
    destination: &Path,
    file_name: &str,
    label: &str,
    base: f32,
    span: f32,
    expected: u64,
) -> Result<(), String> {
    update(
        "Verifying local models",
        &format!("Checking {label} ({file_name})"),
        base + span * 0.1,
    );
    if try_seed_existing_model(file_name, destination, expected) {
        update(
            "Verified local model",
            &format!("{label} ready in local model store"),
            base + span,
        );
        thread::sleep(Duration::from_millis(320));
        return Ok(());
    }

    let temp = destination.with_extension("gguf.download");
    let script = format!(
        "$ProgressPreference='SilentlyContinue'; try {{ Start-BitsTransfer -Source '{}' -Destination {} -ErrorAction Stop }} catch {{ Invoke-WebRequest -UseBasicParsing -Uri '{}' -OutFile {} }}",
        url,
        ps_quote(&temp),
        url,
        ps_quote(&temp)
    );
    let mut child = Command::new("powershell.exe")
        .args(["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", &script])
        .creation_flags(0x08000000)
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .spawn()
        .map_err(|e| e.to_string())?;
    loop {
        if is_cancelled() {
            let _ = child.kill();
            let _ = fs::remove_file(&temp);
            return Err("Installation cancelled by user".to_string());
        }
        if let Some(exit) = child.try_wait().map_err(|e| e.to_string())? {
            if !exit.success() {
                return Err(format!("Could not download {label}"));
            }
            break;
        }
        let bytes = temp.metadata().map(|m| m.len()).unwrap_or(0);
        let ratio = (bytes as f32 / expected as f32).clamp(0.0, 0.98);
        update(
            "Downloading local models",
            &format!("{} \u{b7} {:.0} MB", label, bytes as f32 / 1_048_576.0),
            base + span * ratio,
        );
        thread::sleep(Duration::from_millis(550));
    }
    fs::rename(&temp, destination).map_err(|e| e.to_string())?;
    Ok(())
}

fn create_shortcut(shortcut: &Path, engine: &Path, root: &Path) {
    let icon = root.join("catalyst.ico");
    let script = format!(
        "$w=New-Object -ComObject WScript.Shell;$s=$w.CreateShortcut({});$s.TargetPath={};$s.WorkingDirectory={};$s.IconLocation={};$s.Description='Catalyst local coding agent';$s.Save()",
        ps_quote(shortcut),
        ps_quote(engine),
        ps_quote(root),
        ps_quote(&icon)
    );
    let _ = Command::new("powershell.exe")
        .args(["-NoProfile", "-Command", &script])
        .creation_flags(0x08000000)
        .status();
}

#[cfg(windows)]
trait HiddenCommand {
    fn creation_flags(&mut self, flags: u32) -> &mut Self;
}
#[cfg(windows)]
impl HiddenCommand for Command {
    fn creation_flags(&mut self, flags: u32) -> &mut Self {
        use std::os::windows::process::CommandExt;
        CommandExt::creation_flags(self, flags)
    }
}

fn install(profile: String, desktop: bool) {
    CANCELLED.store(false, Ordering::Relaxed);
    {
        let mut value = state().lock().unwrap();
        value.done = false;
        value.error = false;
        value.progress = 1.0;
        value.stage = "Preparing workspace".into();
        value.detail = "Creating local directories".into();
    }
    let result = (|| -> Result<(), String> {
        let root = get_effective_install_dir();
        let models = root.join("models");
        update("Preparing workspace", "Creating install folders", 3.0);
        fs::create_dir_all(&models).map_err(|e| e.to_string())?;
        thread::sleep(Duration::from_millis(250));

        if is_cancelled() {
            cleanup_install(&root);
            return Err("Installation cancelled".to_string());
        }

        update("Installing Catalyst Engine", "Writing Catalyst.exe runtime", 8.0);
        let engine = root.join("Catalyst.exe");
        let _ = fs::write(&engine, ENGINE);
        let _ = fs::write(root.join("catalyst.ico"), include_bytes!("../../assets/catalyst.ico"));

        if is_cancelled() {
            cleanup_install(&root);
            return Err("Installation cancelled".to_string());
        }

        let mut list = vec![(
            "Spark 2.0",
            "https://huggingface.co/Qwen/Qwen2.5-Coder-0.5B-Instruct-GGUF/resolve/main/qwen2.5-coder-0.5b-instruct-q4_k_m.gguf",
            "catalyst-spark-2.0-q4_k_m.gguf",
            491_400_064u64,
        )];
        if profile != "essential" {
            list.push((
                "Prism 2.0",
                "https://huggingface.co/Qwen/Qwen2.5-Coder-1.5B-Instruct-GGUF/resolve/main/qwen2.5-coder-1.5b-instruct-q4_k_m.gguf",
                "catalyst-prism-2.0-q4_k_m.gguf",
                1_117_320_768,
            ));
        }
        if profile == "complete" {
            list.push((
                "Zenith 2.0",
                "https://huggingface.co/Qwen/Qwen2.5-Coder-3B-Instruct-GGUF/resolve/main/qwen2.5-coder-3b-instruct-q4_k_m.gguf",
                "catalyst-zenith-2.0-q4_k_m.gguf",
                2_104_932_800,
            ));
            list.push((
                "Apex 1.2",
                "https://huggingface.co/Qwen/Qwen2.5-Coder-7B-Instruct-GGUF/resolve/main/qwen2.5-coder-7b-instruct-q4_k_m.gguf",
                "catalyst-apex-1.2-q4_k_m.gguf",
                4_683_073_536,
            ));
        }

        let span = 82.0 / list.len() as f32;
        for (index, (name, url, file, size)) in list.iter().enumerate() {
            download(
                url,
                &models.join(file),
                file,
                name,
                10.0 + span * index as f32,
                span,
                *size,
            )?;
        }
        update("Finishing setup", "Registering shortcuts & icons", 95.0);
        create_shortcut(&root.join("Catalyst.lnk"), &engine, &root);
        if desktop {
            if let Ok(profile_dir) = env::var("USERPROFILE") {
                let d = Path::new(&profile_dir).join("Desktop");
                if d.is_dir() {
                    create_shortcut(&d.join("Catalyst.lnk"), &engine, &root);
                }
            }
        }
        update("Catalyst is ready", "Installation complete", 100.0);
        Ok(())
    })();
    let mut value = state().lock().unwrap();
    value.done = true;
    if let Err(error) = result {
        value.error = true;
        value.stage = "Setup needs attention".into();
        value.detail = error;
    }
}

fn launch() {
    let root = get_effective_install_dir();
    let _ = Command::new(root.join("Catalyst.exe")).current_dir(&root).spawn();
}

fn respond(mut stream: TcpStream, status: &str, content_type: &str, body: &[u8]) {
    let head = format!(
        "HTTP/1.1 {status}\r\nContent-Type: {content_type}\r\nContent-Length: {}\r\nCache-Control: no-store\r\nConnection: close\r\n\r\n",
        body.len()
    );
    let _ = stream.write_all(head.as_bytes());
    let _ = stream.write_all(body);
}

fn handle(mut stream: TcpStream) {
    let mut buffer = [0u8; 4096];
    let read = stream.read(&mut buffer).unwrap_or(0);
    let request = String::from_utf8_lossy(&buffer[..read]);
    let line = request.lines().next().unwrap_or("");
    if line.starts_with("POST /api/install") {
        let profile = if line.contains("profile=essential") {
            "essential"
        } else if line.contains("profile=recommended") {
            "recommended"
        } else {
            "complete"
        };
        let desktop = !line.contains("desktop=0");
        let can_start = {
            let value = state().lock().unwrap();
            value.progress == 0.0 || value.done
        };
        if can_start {
            let profile = profile.to_string();
            thread::spawn(move || install(profile, desktop));
        }
        respond(stream, "202 Accepted", "application/json", br#"{"ok":true}"#);
    } else if line.starts_with("POST /api/cancel_cleanup") {
        CANCELLED.store(true, Ordering::Relaxed);
        let root = get_effective_install_dir();
        cleanup_install(&root);
        send_ui(Ui::Close);
        respond(stream, "200 OK", "application/json", br#"{"ok":true}"#);
    } else if line.starts_with("POST /api/select_folder") {
        let selected = choose_folder_dialog();
        if let Some(ref p) = selected {
            set_custom_dir(p.clone());
        }
        let current = get_effective_install_dir();
        let body = format!(r#"{{"path":"{}"}}"#, json_escape(&current.display().to_string()));
        respond(stream, "200 OK", "application/json", body.as_bytes());
    } else if line.starts_with("GET /api/get_folder") {
        let current = get_effective_install_dir();
        let body = format!(r#"{{"path":"{}"}}"#, json_escape(&current.display().to_string()));
        respond(stream, "200 OK", "application/json", body.as_bytes());
    } else if line.starts_with("GET /api/hardware") {
        let hw = get_system_hardware();
        let body = format!(
            r#"{{"total_ram_gb":{:.1},"avail_ram_gb":{:.1},"cpu_cores":{},"recommended_profile":"{}"}}"#,
            hw.total_ram_gb, hw.avail_ram_gb, hw.cpu_cores, hw.recommended_profile
        );
        respond(stream, "200 OK", "application/json", body.as_bytes());
    } else if line.starts_with("POST /api/window") {
        if line.contains("cmd=drag") {
            send_ui(Ui::Drag);
        } else if line.contains("cmd=min") {
            send_ui(Ui::Minimize);
        } else if line.contains("cmd=close") {
            send_ui(Ui::Close);
        }
        respond(stream, "200 OK", "application/json", br#"{"ok":true}"#);
    } else if line.starts_with("POST /api/launch") {
        launch();
        respond(stream, "200 OK", "application/json", br#"{"ok":true}"#);
    } else if line.starts_with("GET /api/status") {
        let value = state().lock().unwrap();
        let body = format!(
            r#"{{"stage":"{}","detail":"{}","progress":{},"done":{},"error":{}}}"#,
            json_escape(&value.stage),
            json_escape(&value.detail),
            value.progress,
            value.done,
            value.error
        );
        respond(stream, "200 OK", "application/json", body.as_bytes());
    } else if line.starts_with("GET /logo.svg") {
        respond(stream, "200 OK", "image/svg+xml", LOGO_SVG.as_bytes());
    } else if line.starts_with("GET /logo.png") {
        respond(stream, "200 OK", "image/png", LOGO_PNG);
    } else if line.starts_with("GET / ") || line.starts_with("GET /index.html") {
        respond(stream, "200 OK", "text/html; charset=utf-8", PAGE.as_bytes());
    } else {
        respond(stream, "404 Not Found", "text/plain", b"Not found");
    }
}

enum Ui {
    Drag,
    Minimize,
    Close,
}

fn bind_server() -> Option<(TcpListener, u16)> {
    for port in DEFAULT_PORT..DEFAULT_PORT + 25 {
        if let Ok(listener) = TcpListener::bind(("127.0.0.1", port)) {
            return Some((listener, port));
        }
    }
    None
}

fn main() {
    let (listener, port) = match bind_server() {
        Some(v) => v,
        None => return,
    };
    thread::spawn(move || {
        for stream in listener.incoming().flatten() {
            thread::spawn(|| handle(stream));
        }
    });

    let event_loop = EventLoopBuilder::<Ui>::with_user_event().build();
    let proxy = event_loop.create_proxy();
    let _ = PROXY.set(Mutex::new(proxy.clone()));

    let (w, h) = (960.0, 600.0);
    let window = WindowBuilder::new()
        .with_title("Catalyst Setup")
        .with_decorations(false)
        .with_transparent(false)
        .with_resizable(false)
        .with_inner_size(LogicalSize::new(w, h))
        .with_window_icon(Icon::from_rgba(ICON_RGBA.to_vec(), 64, 64).ok())
        .build(&event_loop)
        .expect("window");

    if let Some(m) = window.current_monitor() {
        let s = m.size();
        let ws = window.outer_size();
        window.set_outer_position(PhysicalPosition::new(
            (s.width.saturating_sub(ws.width)) as i32 / 2 + m.position().x,
            (s.height.saturating_sub(ws.height)) as i32 / 2 + m.position().y,
        ));
    }

    let data_dir = env::temp_dir().join("catalyst-setup-webview");
    let mut ctx = wry::WebContext::new(Some(data_dir));
    let _webview = WebViewBuilder::new_with_web_context(&mut ctx)
        .with_background_color((13, 12, 11, 255))
        .with_url(format!("http://127.0.0.1:{port}"))
        .with_ipc_handler(move |req| {
            let cmd = match req.body().as_str() {
                "drag" => Ui::Drag,
                "min" => Ui::Minimize,
                _ => Ui::Close,
            };
            let _ = proxy.send_event(cmd);
        })
        .build(&window)
        .expect("webview");

    event_loop.run(move |event, _, flow| {
        *flow = ControlFlow::Wait;
        match event {
            Event::UserEvent(Ui::Drag) => {
                let _ = window.drag_window();
            }
            Event::UserEvent(Ui::Minimize) => window.set_minimized(true),
            Event::UserEvent(Ui::Close)
            | Event::WindowEvent {
                event: WindowEvent::CloseRequested,
                ..
            } => *flow = ControlFlow::Exit,
            _ => {}
        }
    });
}
