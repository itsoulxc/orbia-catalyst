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

fn bundled_model(file: &str) -> Option<PathBuf> {
    let exe_dir = env::current_exe().ok()?.parent()?.to_path_buf();
    let candidate = exe_dir.join("models").join(file);
    if candidate.is_file() {
        Some(candidate)
    } else {
        None
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
const APP: &[u8] = include_bytes!(r"..\..\..\release\app\Catalyst.exe");
const DEFAULT_PORT: u16 = 39871;
const PRODUCT_VERSION: &str = "2.1.1";

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
    let script = "$app = New-Object -ComObject Shell.Application; $f = $app.BrowseForFolder(0, 'Choose where to install Catalyst', 0, 0); if ($f) { $f.Self.Path }";
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
    let _ = fs::remove_file(root.join("install-manifest.json"));
    if let Ok(profile_dir) = env::var("USERPROFILE") {
        let d = Path::new(&profile_dir).join("Desktop").join("Catalyst.lnk");
        let _ = fs::remove_file(d);
    }
    if let Ok(app_data) = env::var("APPDATA") {
        let start = Path::new(&app_data)
            .join("Microsoft")
            .join("Windows")
            .join("Start Menu")
            .join("Programs")
            .join("Catalyst.lnk");
        let _ = fs::remove_file(start);
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

fn backup_program_files(root: &Path) {
    for file in ["Catalyst.exe", "catalyst-engine.exe", "catalyst.ico"] {
        let source = root.join(file);
        if source.is_file() {
            let _ = fs::copy(&source, root.join(format!("{file}.previous")));
        }
    }
}

fn restore_program_files(root: &Path) {
    for file in ["Catalyst.exe", "catalyst-engine.exe", "catalyst.ico"] {
        let backup = root.join(format!("{file}.previous"));
        if backup.is_file() {
            let _ = fs::rename(&backup, root.join(file));
        }
    }
}

fn discard_program_backups(root: &Path) {
    for file in ["Catalyst.exe", "catalyst-engine.exe", "catalyst.ico"] {
        let _ = fs::remove_file(root.join(format!("{file}.previous")));
    }
}

fn reg_add(key: &str, name: &str, value: &str) {
    let _ = Command::new("reg.exe")
        .args(["add", key, "/v", name, "/t", "REG_SZ", "/d", value, "/f"])
        .creation_flags(0x08000000)
        .status();
}

fn register_windows_app(root: &Path) {
    let key = r"HKCU\Software\Microsoft\Windows\CurrentVersion\Uninstall\Orbia Catalyst";
    let setup = root.join("Catalyst-Setup.exe");
    let app = root.join("Catalyst.exe");
    let icon = root.join("catalyst.ico");
    let _ = fs::copy(env::current_exe().unwrap_or_else(|_| setup.clone()), &setup);
    reg_add(key, "DisplayName", "Orbia Catalyst");
    reg_add(key, "Publisher", "Orbia");
    reg_add(key, "DisplayVersion", PRODUCT_VERSION);
    reg_add(key, "InstallLocation", &root.display().to_string());
    reg_add(key, "DisplayIcon", &icon.display().to_string());
    reg_add(
        key,
        "UninstallString",
        &format!("\"{}\" --uninstall", setup.display()),
    );
    reg_add(
        key,
        "ModifyPath",
        &format!("\"{}\" --modify", setup.display()),
    );
    reg_add(
        key,
        "RepairPath",
        &format!("\"{}\" --repair", setup.display()),
    );
    reg_add(key, "NoModify", "0");
    reg_add(key, "NoRepair", "0");
    reg_add(key, "EstimatedSize", "250000");
    reg_add(
        r"HKCU\Software\Classes\AppUserModelId\Orbia.Catalyst",
        "DisplayName",
        "Orbia Catalyst",
    );
    let _ = app;
}

fn unregister_windows_app() {
    let _ = Command::new("reg.exe")
        .args([
            "delete",
            r"HKCU\Software\Microsoft\Windows\CurrentVersion\Uninstall\Orbia Catalyst",
            "/f",
        ])
        .creation_flags(0x08000000)
        .status();
}

fn uninstall_installed(preserve_models: bool) -> Result<(), String> {
    let root = app_dir();
    ensure_catalyst_stopped()?;
    unregister_windows_app();
    let models = root.join("models");
    let script = if preserve_models {
        format!(
            "$root={}; Start-Sleep -Milliseconds 500; Remove-Item -LiteralPath ($root+'\\Catalyst.exe'),($root+'\\catalyst-engine.exe'),($root+'\\catalyst.ico'),($root+'\\Catalyst.lnk'),($root+'\\Catalyst-Setup.exe'),($root+'\\install-manifest.json') -Force -ErrorAction SilentlyContinue; Remove-Item -LiteralPath $root -Force -ErrorAction SilentlyContinue",
            ps_quote(&root)
        )
    } else {
        format!(
            "$root={}; Start-Sleep -Milliseconds 500; Remove-Item -LiteralPath $root -Recurse -Force -ErrorAction SilentlyContinue",
            ps_quote(&root)
        )
    };
    Command::new("powershell.exe")
        .args(["-NoProfile", "-WindowStyle", "Hidden", "-Command", &script])
        .creation_flags(0x08000000)
        .spawn()
        .map_err(|e| format!("Unable to schedule uninstall: {e}"))?;
    let _ = models;
    Ok(())
}

fn ensure_catalyst_stopped() -> Result<(), String> {
    // Windows keeps executable and memory-mapped model files locked while the
    // app is running.  Detect that before creating/overwriting anything so a
    // reinstall does not fail halfway through with the opaque OS error 32.
    let mut running = false;
    for image in ["Catalyst.exe", "catalyst-engine.exe"] {
        let output = Command::new("tasklist")
            .args(["/FI", &format!("IMAGENAME eq {image}")])
            .creation_flags(0x08000000)
            .output()
            .map_err(|e| format!("Could not check whether Catalyst is running: {e}"))?;
        let text = String::from_utf8_lossy(&output.stdout).to_ascii_lowercase();
        running |= text.contains(&image.to_ascii_lowercase());
    }
    if running {
        return Err(
            "Catalyst is still running. Close Catalyst (including the tray/background window) and try Install again.".to_string(),
        );
    }
    Ok(())
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
        candidates.push(PathBuf::from(
            r"D:\Catalyst\models\catalyst-apex-1.1-q4_k_m.gguf",
        ));
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
        "Checking models",
        &format!("Looking for {label}"),
        base + span * 0.1,
    );
    if try_seed_existing_model(file_name, destination, expected) {
        update("Checking models", &format!("{label} is ready"), base + span);
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
        .args([
            "-NoProfile",
            "-ExecutionPolicy",
            "Bypass",
            "-Command",
            &script,
        ])
        .creation_flags(0x08000000)
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .spawn()
        .map_err(|e| e.to_string())?;
    loop {
        if is_cancelled() {
            let _ = child.kill();
            let _ = fs::remove_file(&temp);
            return Err("Install cancelled".to_string());
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
            "Downloading models",
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

fn write_install_manifest(root: &Path, profile: &str) -> Result<(), String> {
    let manifest = format!(
        "{{\n  \"product\": \"Catalyst\",\n  \"version\": \"{}\",\n  \"install_dir\": \"{}\",\n  \"profile\": \"{}\",\n  \"installed_at\": \"{}\"\n}}\n",
        PRODUCT_VERSION,
        json_escape(&root.display().to_string()),
        json_escape(profile),
        json_escape(&format!("{:?}", std::time::SystemTime::now()))
    );
    fs::write(root.join("install-manifest.json"), manifest)
        .map_err(|e| format!("Unable to write install manifest: {e}"))
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
        value.stage = "Getting ready".into();
        value.detail = "Creating folders".into();
    }
    let result = (|| -> Result<(), String> {
        let root = get_effective_install_dir();
        let models = root.join("models");
        ensure_catalyst_stopped()?;
        update("Getting ready", "Creating folders", 3.0);
        fs::create_dir_all(&models).map_err(|e| e.to_string())?;
        thread::sleep(Duration::from_millis(250));

        if is_cancelled() {
            cleanup_install(&root);
            return Err("Install cancelled".to_string());
        }

        update("Copying Catalyst", "Writing program files", 8.0);
        backup_program_files(&root);
        let engine = root.join("catalyst-engine.exe");
        let app = root.join("Catalyst.exe");
        fs::write(&engine, ENGINE).map_err(|e| e.to_string())?;
        fs::write(&app, APP).map_err(|e| e.to_string())?;
        let _ = fs::write(
            root.join("catalyst.ico"),
            include_bytes!("../../assets/catalyst.ico"),
        );

        if is_cancelled() {
            cleanup_install(&root);
            return Err("Install cancelled".to_string());
        }

        let mut list = vec![(
            "Spark 2.1",
            "https://huggingface.co/itsoulxc/catalyst-models/resolve/main/catalyst-spark-2.1-q4_k_m.gguf?download=true",
            "catalyst-spark-2.1-q4_k_m.gguf",
            491_400_064u64,
        )];
        if profile != "essential" {
            list.push((
                "Prism 2.1",
                "https://huggingface.co/itsoulxc/catalyst-models/resolve/main/catalyst-prism-2.1-q4_k_m.gguf?download=true",
                "catalyst-prism-2.1-q4_k_m.gguf",
                1_117_320_768,
            ));
        }
        if profile == "complete" {
            list.push((
                "Zenith 2.1",
                "https://huggingface.co/itsoulxc/catalyst-models/resolve/main/catalyst-zenith-2.1-q4_k_m.gguf?download=true",
                "catalyst-zenith-2.1-q4_k_m.gguf",
                4_683_073_536,
            ));
            list.push((
                "Apex 1.2",
                "https://huggingface.co/itsoulxc/catalyst-models/resolve/main/catalyst-apex-1.2-q4_k_m.gguf?download=true",
                "catalyst-apex-1.2-q4_k_m.gguf",
                4_683_073_536,
            ));
        }

        let span = 82.0 / list.len() as f32;
        for (index, (name, url, file, size)) in list.iter().enumerate() {
            let destination = models.join(file);
            if let Some(source) = bundled_model(file) {
                update(name, "Copying model", 10.0 + span * index as f32);
                fs::copy(source, &destination)
                    .map_err(|e| format!("Unable to install bundled {file}: {e}"))?;
                update(name, "Model copied", 10.0 + span * (index as f32 + 0.9));
            } else {
                download(
                    url,
                    &destination,
                    file,
                    name,
                    10.0 + span * index as f32,
                    span,
                    *size,
                )?;
            }
        }
        update("Finishing up", "Adding shortcuts", 95.0);
        // Shortcuts must launch the native shell, not the headless engine.
        create_shortcut(&root.join("Catalyst.lnk"), &app, &root);
        if let Ok(app_data) = env::var("APPDATA") {
            let start_menu = Path::new(&app_data)
                .join("Microsoft")
                .join("Windows")
                .join("Start Menu")
                .join("Programs");
            let _ = fs::create_dir_all(&start_menu);
            create_shortcut(&start_menu.join("Catalyst.lnk"), &app, &root);
        }
        if desktop {
            if let Ok(profile_dir) = env::var("USERPROFILE") {
                let d = Path::new(&profile_dir).join("Desktop");
                if d.is_dir() {
                    create_shortcut(&d.join("Catalyst.lnk"), &app, &root);
                }
            }
        }
        write_install_manifest(&root, &profile)?;
        register_windows_app(&root);
        discard_program_backups(&root);
        update("Done", "", 100.0);
        Ok(())
    })();
    let mut value = state().lock().unwrap();
    value.done = true;
    if let Err(error) = result {
        restore_program_files(&get_effective_install_dir());
        value.error = true;
        value.stage = "Install stopped".into();
        value.detail = error;
    }
}

fn launch() {
    let root = get_effective_install_dir();
    let _ = Command::new(root.join("Catalyst.exe"))
        .current_dir(&root)
        .spawn();
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
        respond(
            stream,
            "202 Accepted",
            "application/json",
            br#"{"ok":true}"#,
        );
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
        let body = format!(
            r#"{{"path":"{}"}}"#,
            json_escape(&current.display().to_string())
        );
        respond(stream, "200 OK", "application/json", body.as_bytes());
    } else if line.starts_with("GET /api/get_folder") {
        let current = get_effective_install_dir();
        let body = format!(
            r#"{{"path":"{}"}}"#,
            json_escape(&current.display().to_string())
        );
        respond(stream, "200 OK", "application/json", body.as_bytes());
    } else if line.starts_with("GET /api/installation") {
        let root = get_effective_install_dir();
        let body = format!(
            r#"{{"installed":{},"path":"{}"}}"#,
            root.join("install-manifest.json").is_file(),
            json_escape(&root.display().to_string())
        );
        respond(stream, "200 OK", "application/json", body.as_bytes());
    } else if line.starts_with("POST /api/uninstall") {
        match uninstall_installed(true) {
            Ok(()) => respond(
                stream,
                "202 Accepted",
                "application/json",
                br#"{"ok":true}"#,
            ),
            Err(error) => respond(
                stream,
                "409 Conflict",
                "application/json",
                format!(r#"{{"error":"{}"}}"#, json_escape(&error)).as_bytes(),
            ),
        }
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
        respond(
            stream,
            "200 OK",
            "text/html; charset=utf-8",
            PAGE.as_bytes(),
        );
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
    let args: Vec<String> = env::args().collect();
    if args.iter().any(|arg| arg == "--uninstall") {
        let _ = uninstall_installed(true);
        return;
    }
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
        .with_devtools(false)
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
