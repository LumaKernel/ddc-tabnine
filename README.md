# ddc-tabnine

[![Doc](https://img.shields.io/badge/doc-%3Ah%20ddc--tabnine-orange.svg?style=flat-square)](doc/ddc-tabnine.txt)

[TabNine](https://www.tabnine.com) Completion for ddc.vim

This source collects candidates from [TabNine](https://www.tabnine.com).

**EXPERIMENTAL**: Using some [undocumented features](#why-experimental).

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
[special commands](https://www.tabnine.com/faq#special_commands) to configure
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
