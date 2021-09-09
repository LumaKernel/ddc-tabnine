function! ddc_tabnine#restart() abort
  return denops#request('ddc-tabnine', 'ddc_tabnine_restart', [])
endfunction

function! ddc_tabnine#reinstall() abort
  return denops#request('ddc-tabnine', 'ddc_tabnine_reinstall', [])
endfunction

function! ddc_tabnine#clean() abort
  return denops#request('ddc-tabnine', 'ddc_tabnine_clean', [])
endfunction

function! ddc_tabnine#which() abort
  return denops#request('ddc-tabnine', 'ddc_tabnine_which', [])
endfunction

function! ddc_tabnine#version() abort
  return denops#request('ddc-tabnine', 'ddc_tabnine_version', [])
endfunction

function! ddc_tabnine#config_path() abort
  return denops#request('ddc-tabnine', 'ddc_tabnine_config_path', [])
endfunction
