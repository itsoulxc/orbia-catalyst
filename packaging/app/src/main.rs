#![windows_subsystem = "windows"]

use std::{env, process::{Command, Stdio}, thread, time::Duration};
use tao::{event::{Event, WindowEvent}, event_loop::{ControlFlow, EventLoopBuilder}, window::WindowBuilder};
use wry::WebViewBuilder;

fn main() {
    let root = env::current_exe().ok().and_then(|p| p.parent().map(|x| x.to_path_buf())).unwrap_or_default();
    let engine = root.join("catalyst-engine.exe");
    let mut child = Command::new(engine).current_dir(&root).env("CATALYST_NO_LAUNCH", "1")
        .stdin(Stdio::null()).stdout(Stdio::null()).stderr(Stdio::null()).spawn().ok();
    thread::sleep(Duration::from_millis(350));

    let event_loop = EventLoopBuilder::<String>::with_user_event().build();
    let proxy = event_loop.create_proxy();
    let window = WindowBuilder::new().with_title("Catalyst").with_decorations(false)
        .with_resizable(true).with_maximized(true).build(&event_loop).expect("window");
    let _webview = WebViewBuilder::new().with_url("http://127.0.0.1:8008")
        .with_ipc_handler(move |req| { let _ = proxy.send_event(req.body().clone()); })
        .build(&window).expect("webview");

    event_loop.run(move |event, _, flow| {
        *flow = ControlFlow::Wait;
        match event {
            Event::UserEvent(cmd) if cmd == "min" => { window.set_minimized(true); }
            Event::UserEvent(cmd) if cmd == "max" => { window.set_maximized(!window.is_maximized()); }
            Event::UserEvent(cmd) if cmd == "close" => { *flow = ControlFlow::Exit; }
            Event::WindowEvent { event: WindowEvent::CloseRequested, .. } => *flow = ControlFlow::Exit,
            Event::LoopDestroyed => if let Some(mut p) = child.take() { let _ = p.kill(); },
            _ => {}
        }
    });
}
