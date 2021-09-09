# ddc-tabnine

[TabNine](https://www.tabnine.com) Completion for ddc.vim

This source collects candidates from [TabNine](https://www.tabnine.com).

**EXPERIMENTAL**: Using some [undocumented featuers](##Why-Experimental).

## TODOs

- [x] Provide completion to ddc.vim.
- [x] Define some util functions.
  - [x] `call ddc_tabnine#restart()` - to remedy. clean all and reinstall
  - [x] `call ddc_tabnine#reinstall()` - to remedy. clean all and reinstall
  - [x] `call ddc_tabnine#clean()` - to remedy. remove all versions
  - [x] `call ddc_tabnine#is_running()` - is running
  - [x] `call ddc_tabnine#which()` - which binaries are used
  - [x] `call ddc_tabnine#version()` - get binary version
  - [x] `call ddc_tabnine#config_path()` - get config path
- [x] Write docs
- [x] Write docs for functions
- [N/A] When installing, remove other old version binaries.
  - If at least one version exists, installation won't run.
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
`:exe 'e' ddc_tabnine#config_dir() . '/tabnine_config.json'`.

## Credits

- https://www.tabnine.com
- https://github.com/codota/TabNine/blob/master/HowToWriteAClient.md
- https://github.com/Shougo/ddc.vim
- https://github.com/neoclide/coc-tabnine
- https://github.com/tbodt/deoplete-tabnine

## Why Experimental?

- ddc.vim itself is experimental.
- Using undocumented dispatcher from ddc.vim
  `denops.dispatch("ddc", "getGlobal")`.
