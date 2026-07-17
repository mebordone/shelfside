fn main() {
    // Android 15+ / Google Play: ELF LOAD segments must be 16 KB aligned.
    // Tauri overrides .cargo/config.toml rustflags; inject via build.rs instead.
    // https://developer.android.com/guide/practices/page-sizes
    let target = std::env::var("TARGET").unwrap_or_default();
    if target.contains("android") {
        println!("cargo:rustc-link-arg=-Wl,-z,max-page-size=16384");
        println!("cargo:rustc-link-arg=-Wl,-z,common-page-size=16384");
    }

    tauri_build::build()
}
