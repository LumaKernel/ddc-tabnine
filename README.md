# ddc-tabnine

[TabNine](https://www.tabnine.com) Completion for ddc.vim

This source collects candidates from [TabNine](https://www.tabnine.com).

**EXPERIMENTAL**

## TODOs

- [x] Provide completion to ddc.vim.
- [ ] Define some util functions.
  - [ ] `call ddc_tabnine#reinstall()` - to remedy. clear all and reinstall
  - [ ] `call ddc_tabnine#clean()` - to remedy. remove all versions
  - [ ] `call ddc_tabnine#which()` - which binaries are used
  - [ ] `call ddc_tabnine#version()` - get binary version
  - [ ] `call ddc_tabnine#config_path()` - get config path
- [x] Write docs
- [ ] When installing, remove other old version binaries.
- [x] Refactoring around imports.

## Required

- [denops.vim](https://github.com/vim-denops/denops.vim)
- [ddc.vim](https://github.com/Shougo/ddc.vim)

## Configuration

```vim
call ddc#custom#patch_global('sources', ['tabnine'])
call ddc#custom#patch_global('sourceOptions', {
    \ 'tabnine': {
    \   'mark': 'TN',
    \   'isVolatile': v:true,
    \   'maxSize': 200,
    \ }})
```

## Special Commands

You can trigger the
[special comands](https://www.tabnine.com/faq#special_commands) to configure
your TabNine like `TabNine::config` in any buffer.

(Optional) To configure your purchased API key, use `TabNine::config` or
`:exe 'e' ddc_tabnine#config_path()`.

## Credits

- https://www.tabnine.com
- https://github.com/codota/TabNine/blob/master/HowToWriteAClient.md
- https://github.com/Shougo/ddc.vim
- https://github.com/neoclide/coc-tabnine
- https://github.com/tbodt/deoplete-tabnine
