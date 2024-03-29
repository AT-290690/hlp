aliases= [cos; math_cos; sin; math_sin; PI; math_PI; insert; dom_insert; canvas; dom_canvas; get_context; canvas_get_context; stroke; canvas_stroke; stroke_style; canvas_stroke_style; begin_path; canvas_begin_path; move_to; canvas_move_to; line_to; canvas_line_to; line_width; canvas_line_width; attributes; dom_set_attributes; fill_rect; canvas_fill_rect; fill_style; canvas_fill_style; style; dom_set_style]; 
:= [make_bit; -> [x; 
		|> [x; 
			bit_make_bit []; 
			.:from_string [""]; 
			.:map>> [-> [x; 
					` [x]]]]]; 
	N; math_pow2 [50]; 
	size; 10; 
	width; 130; 
	height; * [N; size]]; 
|> [:= [root; dom_get_root []]; 
	insert [:= [my_canvas; |> [canvas []; 
				attributes [:: ["w"; width; "h"; height]]; style [:: ["b"; "s2w"]]]]]]; 
:= [ctx; get_context [my_canvas; "2d"]]; 
:= [cols; .: ["#fff"; "#000"]]; 
|> [ctx; 
	fill_style [.:< [cols]]; 
	fill_rect [0; 0; width; height]]; 
|> [.:... [N]; 
	.:map>> [make_bit]; 
	.:map>> [-> [x; 
			: [*loop [- [13; 
						.:length [x]]; 
					-> [.: <= [x; 0]]]; x]]]; 
	.:map>> [-> [x; i; 
			.:map>> [x; 
				-> [y; j; 
					|> [ctx; 
						fill_style [.:. [cols; y]]; 
						fill_rect [* [j; size]; 
							* [i; size]; size; size]]]]]]]