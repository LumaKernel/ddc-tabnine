# ddc-tabnine

TabNine Completion for ddc.vim

This source collects candidates from TabNine.

**EXPERIMENTAL**

## TODOs

- [x] Provide completion to ddc.vim.
- [ ] Define some util functions.
  - `call tabnine#reinstall()`
- [x] Write docs
- [ ] When installing, remove other old version binaries.
- [ ] Refactoring around imports.

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

## Credits

- https://github.com/Shougo/ddc.vim
- https://github.com/neoclide/coc-tabnine
- https://github.com/tbodt/deoplete-tabnine
