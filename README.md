# ddc-tabnine

**EXPERIMENTAL**

## TODOs

- [x] Provide completion to ddc.vim.
- [ ] Define some util functions.
  - `call tabnine#reinstall()`
- [ ] Write docs
- [ ] When installing, remove other old version binaries.
- [ ] Refactoring around imports.

## Setup

```vim
call ddc#custom#patch_global('sources', ['tabnine'])
call ddc#custom#patch_global('sourceOptions', {
    \ 'tabnine': {
    \   'mark': 'TN',
    \   'isVolatile': v:true,
    \   'maxSize': 200,
    \   'maxNumResults': 5,
    \   'storageDir': <XDG cache dir>,
    \ }})
```

## Options

- maxSize: Max number of lines to pipe to cli.
- maxNumResults: Max number of results to retrieve. Preferable to use rather
  than built-in's `maxCandidates` since this is natively implemented by TabNine.
- storageDir: Storage path placement to store binary files.

## Credits

- https://github.com/Shougo/ddc.vim
- https://github.com/neoclide/coc-tabnine
- https://github.com/tbodt/deoplete-tabnine
