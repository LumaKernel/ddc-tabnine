" @param {number} limit
" @return {[
"   string,
"   string,
"   string,
"   boolean,
"   boolean,
"   number,
" ]}
function! ddc_tabnine#internal#get_around(limit) abort
  let [_, line, col; _] = getpos('.')
  let last_line = line('$')
  let before_line = max([1, line - a:limit])
  let before_lines = getline(before_line, line)
  if len(before_lines) > 0
    let before_lines[-1] = before_lines[-1][: col - 2]
  endif
  let after_line = min([last_line, line + a:limit])
  let after_lines = getline(line, after_line)
  if len(after_lines) > 0
    let after_lines[0] = after_lines[0][col - 1:]
  endif

  let filename = bufname()
  let before = join(before_lines, "\n")
  let after = join(map(after_lines, 'v:val . "\n"'), "")
  let region_includes_beginning = before_line == 1 ? v:true : v:false
  let region_includes_end = after_line == last_line ? v:true : v:false

  return [
    \ filename,
    \ before,
    \ after,
    \ region_includes_beginning,
    \ region_includes_end,
  \ ]
endfunction
