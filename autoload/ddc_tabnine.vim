function! ddc_tabnine#restart() abort
  return denops#request('ddc-tabnine', 'restart', [])
endfunction

function! ddc_tabnine#reinstall() abort
  return denops#request('ddc-tabnine', 'reinstall', [])
endfunction

function! ddc_tabnine#is_running() abort
  return denops#request('ddc-tabnine', 'isRunning', [])
endfunction

function! ddc_tabnine#which() abort
  return denops#request('ddc-tabnine', 'which', [])
endfunction

function! ddc_tabnine#version() abort
  return denops#request('ddc-tabnine', 'version', [])
endfunction

function! ddc_tabnine#config_dir() abort
  return denops#request('ddc-tabnine', 'configDir', [])
endfunction
