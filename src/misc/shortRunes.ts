const symbolGenerator = () => {
  let count = 0
  return () => String.fromCharCode(++count + 191)
}
type Runes = ReadonlyArray<ReadonlyArray<string>>
export const symbol = symbolGenerator()
export const runes: Runes = [
  [symbol(), 'canvas_quadratic_curve_to'],
  [symbol(), 'canvas_is_point_in_stroke'],
  [symbol(), 'math_permutations_array'],
  [symbol(), 'canvas_is_point_in_path'],
  [symbol(), 'canvas_bezier_curve_to'],
  [symbol(), 'canvas_reset_transform'],
  [symbol(), 'dom_get_element_by_id'],
  [symbol(), 'units_viewport_height'],
  [symbol(), 'canvas_reset_trasform'],
  [symbol(), 'canvas_get_image_data'],
  [symbol(), 'dom_set_text_content'],
  [symbol(), 'units_viewport_width'],
  [symbol(), 'canvas_get_transform'],
  [symbol(), 'canvas_set_transform'],
  [symbol(), 'canvas_stroke_style'],
  [symbol(), 'bit_un_right_shift'],
  [symbol(), 'text_to_upper_case'],
  [symbol(), 'text_to_lower_case'],
  [symbol(), 'time_set_animation'],
  [symbol(), 'dom_set_attributes'],
  [symbol(), 'dom_create_element'],
  [symbol(), 'dom_load_milligram'],
  [symbol(), 'canvas_get_context'],
  [symbol(), 'math_permutations'],
  [symbol(), 'time_set_interval'],
  [symbol(), 'dom_set_attribute'],
  [symbol(), 'dom_get_attribute'],
  [symbol(), 'units_centimeters'],
  [symbol(), 'units_millimeters'],
  [symbol(), 'canvas_fill_style'],
  [symbol(), 'canvas_clear_rect'],
  [symbol(), 'canvas_begin_path'],
  [symbol(), 'canvas_close_path'],
  [symbol(), 'canvas_line_width'],
  [symbol(), 'canvas_round_rect'],
  [symbol(), 'canvas_draw_image'],
  [symbol(), 'text_make_regexp'],
  [symbol(), 'time_set_timeout'],
  [symbol(), 'canvas_fill_rect'],
  [symbol(), 'canvas_transform'],
  [symbol(), 'canvas_translate'],
  [symbol(), 'bit_right_shift'],
  [symbol(), 'math_random_int'],
  [symbol(), 'text_trim_start'],
  [symbol(), '.:find_index>>'],
  [symbol(), '.:find_index<<'],
  [symbol(), '.:is_in_bounds'],
  [symbol(), ':.intersection'],
  [symbol(), 'bit_left_shift'],
  [symbol(), 'math_factorial'],
  [symbol(), 'math_parse_int'],
  [symbol(), 'dom_load_bulma'],
  [symbol(), 'dom_ns_element'],
  [symbol(), 'dom_mouse_down'],
  [symbol(), 'canvas_move_to'],
  [symbol(), 'canvas_line_to'],
  [symbol(), 'canvas_restore'],
  [symbol(), 'canvas_ellipse'],
  [symbol(), '.:remove_from'],
  [symbol(), '.:from_string'],
  [symbol(), 'math_negative'],
  [symbol(), 'math_INFINITY'],
  [symbol(), 'text_trim_end'],
  [symbol(), 'dom_append_to'],
  [symbol(), 'dom_set_value'],
  [symbol(), 'dom_get_value'],
  [symbol(), 'dom_set_style'],
  [symbol(), 'dom_on_change'],
  [symbol(), 'dom_add_class'],
  [symbol(), 'units_percent'],
  [symbol(), 'canvas_stroke'],
  [symbol(), 'canvas_rotate'],
  [symbol(), 'canvas_arc_to'],
  [symbol(), '.:quick_sort'],
  [symbol(), '.:merge_sort'],
  [symbol(), ':.difference'],
  [symbol(), 'bit_make_bit'],
  [symbol(), 'math_MIN_INT'],
  [symbol(), 'math_MAX_INT'],
  [symbol(), 'math_SQRT1_2'],
  [symbol(), 'text_replace'],
  [symbol(), 'dom_get_body'],
  [symbol(), 'dom_get_root'],
  [symbol(), 'dom_key_down'],
  [symbol(), 'dom_css_link'],
  [symbol(), 'dom_mouse_up'],
  [symbol(), 'units_pixels'],
  [symbol(), 'units_inches'],
  [symbol(), 'units_points'],
  [symbol(), 'canvas_reset'],
  [symbol(), 'canvas_scale'],
  [symbol(), '.:to_string'],
  [symbol(), 'console_log'],
  [symbol(), 'math_divide'],
  [symbol(), 'math_random'],
  [symbol(), 'math_fround'],
  [symbol(), 'math_number'],
  [symbol(), 'math_LOG10E'],
  [symbol(), 'units_picas'],
  [symbol(), 'canvas_rect'],
  [symbol(), 'canvas_save'],
  [symbol(), 'canvas_clip'],
  [symbol(), 'canvas_fill'],
  [symbol(), '.:reduce>>'],
  [symbol(), '.:reduce<<'],
  [symbol(), 'math_clamp'],
  [symbol(), 'math_trunc'],
  [symbol(), 'math_floor'],
  [symbol(), 'math_round'],
  [symbol(), 'math_atan2'],
  [symbol(), 'math_acosh'],
  [symbol(), 'math_asinh'],
  [symbol(), 'math_atanh'],
  [symbol(), 'math_hypot'],
  [symbol(), 'math_log10'],
  [symbol(), 'math_SQRT2'],
  [symbol(), 'text_match'],
  [symbol(), 'dom_remove'],
  [symbol(), 'dom_detach'],
  [symbol(), 'dom_insert'],
  [symbol(), 'dom_key_up'],
  [symbol(), 'dom_canvas'],
  [symbol(), 'canvas_arc'],
  [symbol(), '.:flatten'],
  [symbol(), '::entries'],
  [symbol(), 'math_lerp'],
  [symbol(), 'math_sqrt'],
  [symbol(), 'math_mult'],
  [symbol(), 'math_pow2'],
  [symbol(), 'math_sign'],
  [symbol(), 'math_tanh'],
  [symbol(), 'math_atan'],
  [symbol(), 'math_acos'],
  [symbol(), 'math_asin'],
  [symbol(), 'math_log2'],
  [symbol(), 'math_LN10'],
  [symbol(), 'text_trim'],
  [symbol(), 'dom_clear'],
  [symbol(), 'dom_click'],
  [symbol(), '.:filter'],
  [symbol(), '.:rotate'],
  [symbol(), '.:find>>'],
  [symbol(), '.:find<<'],
  [symbol(), '.:add_at'],
  [symbol(), '.:chunks'],
  [symbol(), '.:matrix'],
  [symbol(), '.:length'],
  [symbol(), 'math_abs'],
  [symbol(), 'math_mod'],
  [symbol(), 'math_add'],
  [symbol(), 'math_sub'],
  [symbol(), 'math_pow'],
  [symbol(), 'math_exp'],
  [symbol(), 'math_max'],
  [symbol(), 'math_min'],
  [symbol(), 'math_sin'],
  [symbol(), 'math_cos'],
  [symbol(), 'math_tan'],
  [symbol(), 'math_log'],
  [symbol(), 'math_sum'],
  [symbol(), '.:map>>'],
  [symbol(), '.:map<<'],
  [symbol(), '.:slice'],
  [symbol(), '.:every'],
  [symbol(), ':.union'],
  [symbol(), 'bit_and'],
  [symbol(), 'bit_not'],
  [symbol(), 'bit_xor'],
  [symbol(), 'math_PI'],
  [symbol(), 'dom_div'],
  [symbol(), 'dom_act'],
  [symbol(), '!throw'],
  [symbol(), '.:->::'],
  [symbol(), '.:->:.'],
  [symbol(), '.:flat'],
  [symbol(), '.:some'],
  [symbol(), '.:>!=.'],
  [symbol(), '.:<!=.'],
  [symbol(), '::keys'],
  [symbol(), '::->.:'],
  [symbol(), '::size'],
  [symbol(), ':.size'],
  [symbol(), ':.->.:'],
  [symbol(), '>-'],
  [symbol(), '*>>'],
  [symbol(), '*<<'],
  [symbol(), 'bit_or'],
  [symbol(), 'math_E'],
  [symbol(), '::.!='],
  [symbol(), '*loop'],
  [symbol(), '.:>!='],
  [symbol(), '.:<!='],
  [symbol(), '.:...'],
  [symbol(), ':..!='],
  [symbol(), ':.xor'],
  [symbol(), '.:0|1'],
  [symbol(), '::.?'],
  [symbol(), '::.='],
  [symbol(), '.:.='],
  [symbol(), '.:>='],
  [symbol(), '.:<='],
  [symbol(), ':..?'],
  [symbol(), ':..='],
  [symbol(), 'void'],
  [symbol(), '==='],
  [symbol(), '!=='],
  [symbol(), '::.'],
  [symbol(), '.:.'],
  [symbol(), '...'],
  [symbol(), '?=='],
  [symbol(), '.:<'],
  [symbol(), '.:>'],
  [symbol(), '+='],
  [symbol(), '-='],
  [symbol(), '*='],
  [symbol(), '=='],
  [symbol(), '!='],
  [symbol(), '>='],
  [symbol(), '<='],
  [symbol(), '&&'],
  [symbol(), '||'],
  [symbol(), ':='],
  [symbol(), '->'],
  [symbol(), '>>'],
  [symbol(), '<<'],
  [symbol(), '.:'],
  [symbol(), '::'],
  [symbol(), '|>'],
  [symbol(), '=>'],
  [symbol(), ':.'],
  [symbol(), '~*'],
  [symbol(), ']['],
  [symbol(), ']];'],
  [symbol(), '];'],
  [symbol(), '.:chunks_if'],
  [symbol(), '.:cartesian_product'],
  [symbol(), '.:zip'],
  [symbol(), '.:~zip'],
  [symbol(), '.:unzip'],
  [symbol(), '.:0'],
  [symbol(), '.:adjacent_difference>>'],
  [symbol(), '.:adjacent_difference<<'],
  [symbol(), '.:adjacent_find>>'],
  [symbol(), '.:adjacent_find<<'],
  [symbol(), '.:adjacent_find_index>>'],
  [symbol(), '.:adjacent_find_index<<'],
]

export const makeRunes = (compressed: Runes) => ({
  compressed: new Map(compressed as Iterable<readonly [string, string]>),
  decompressed: new Map(
    compressed.reduce<Runes>(
      (acc, [a, b]) => acc.concat([[b, a]]),
      []
    ) as Iterable<readonly [string, string]>
  ),
})
