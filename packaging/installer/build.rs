fn main() {
    let mut res = winresource::WindowsResource::new();
    res.set_icon("../assets/catalyst.ico");
    res.set("ProductName", "Catalyst");
    res.set("FileDescription", "Catalyst Setup");
    res.set("CompanyName", "Catalyst");
    res.compile().expect("failed to embed icon");
}
