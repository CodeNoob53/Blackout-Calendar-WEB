# Changelog

All notable changes to this project will be documented in this file.

## [2.1.0] - 2025-12-21

### Added
- **Global Performance Optimizations**: 
  - Implemented GPU hardware acceleration for all modal and menu animations using `will-change` and `translate3d`.
  - Added layout isolation (`contain: content`) for animated components to reduce reflow scope.
- **Theme Switching Optimization**:
  - Implemented `no-transitions` logic to prevent "paint storms" when switching between light and dark themes.
  - Reduced theme-switch background transition duration for a snappier feel.
- **Background Resource Management**:
  - Implemented dynamic background optimization: `backdrop-filter` and `filter` are now automatically disabled on the main app-root when heavy UI components (modals/menus) are active.
- **Documentation**:
  - Added a comprehensive [Optimization Guide](docs/optimization-guide.md) for future maintenance and learning.

### Improved
- Modal opening animations are now significantly smoother (60FPS) on both Desktop and Mobile devices.
- Theme switching is now instantaneous on mobile without UI stutters.

---

## [2.0.0] - 2025-12-10

### Added
- Initial release of the redesigned Blackout Calendar WEB.
- Multi-queue support.
- Push notification system.
- Multi-language support (UK/EN).
