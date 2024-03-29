aliases= [element; dom_create_element; attribute; dom_set_attributes; text; dom_set_text_content; attach; dom_append_to; style; dom_set_style; click; dom_click; get_root; dom_get_root; canvas; dom_canvas; get_context; canvas_get_context; fill_style; canvas_fill_style; fill_rect; canvas_fill_rect]; 
' [x; y]; 
:= [N; 24; 
	SIZE; 360; 
	rec; 0; 
	PLAY_ICON; "⏵"; 
	PAUSE_ICON; "⏸"; 
	ALIVE_COLOR; "#f12"; 
	DEAD_COLOR; "#222"; 
	CELL_SIZE; * [SIZE; 
		/ [N]]; 
	r; N; 
	h; * [N; -1]; 
	bounds; * [N; N]; 
	init; -> [N; 
		|> [.:... [N]; 
			.:map>> [-> [0]]]]; 
	cells; init [bounds]; 
	next; init [bounds]; 
	;; Moore neighborhood map
 directions; 
	.: [:: [x; 0; y; 1]; 
		:: [x; 1; y; 0]; 
		:: [x; -1; y; 0]; 
		:: [x; 0; y; -1]; 
		:: [x; 1; y; -1]; 
		:: [x; -1; y; -1]; 
		:: [x; 1; y; 1]; 
		:: [x; -1; y; 1]]; ;; Single dimension iteration
 
	iterate_cells; -> [cells; callback; 
		: [:= [Y; -1]; 
			>> [cells; 
				-> [cell; i; 
					: [= [Y; 
							? [% [i; N]; Y; 
								+= [Y]]]; 
						:= [X; % [i; N]; 
	cell; get_cell [cells; X; Y]]; 
						callback [cell; X; Y]]]]]]; 
	;; getters and setters
 get_cell; 
	-> [board; X; Y; 
		.:. [board; 
			% [+ [X; 
					* [N; Y]]; bounds]]]; set_cell; 
	-> [board; X; Y; val; 
		.:.= [board; 
			% [+ [X; 
					* [N; Y]]; bounds]; val]]; ;; Sum neighborhood
 
	adjacent; -> [X; Y; 
		: [:= [sum; 0]; 
			>> [directions; 
				-> [dir; 
					: [+= [sum; 
							get_cell [cells; 
								+ [X; 
									::. [dir; x]]; 
								+ [Y; 
									::. [dir; y]]]]]]]; sum]]; 
	render; -> [board; 
		iterate_cells [board; 
			-> [is_alive; X; Y; 
				: [|> [ctx; 
						fill_style [? [is_alive; ALIVE_COLOR; DEAD_COLOR]]; 
						fill_rect [* [CELL_SIZE; X]; 
							* [CELL_SIZE; Y]; CELL_SIZE; CELL_SIZE]]]]]]; 
	;; Game of Life logic
 update_state; 
	-> [iterate_cells [cells; 
			-> [is_alive; X; Y; 
				: [:= [neighbors; adjacent [X; Y]]; 
					? [&& [is_alive; 
							< [neighbors; 2]]; 
						set_cell [next; X; Y; 0]; 
						? [&& [is_alive; 
								> [neighbors; 3]]; 
							set_cell [next; X; Y; 0]; 
							? [&& [! [is_alive]; 
									== [neighbors; 3]]; 
								set_cell [next; X; Y; 1]; 
								set_cell [next; X; Y; is_alive]]]]]]]]]; 
:= [root; get_root []]; 
|> [element ["p"]; 
	text ["Click on the canvas to draw cells"]; 
	attach [root]]; 
;; Drawing UI
 
:= [ctx; |> [canvas []; 
		attach [root]; 
		attribute [:: ["w"; SIZE; "h"; SIZE]]; 
		click [-> [e; 
				: [:= [X; math_floor [* [::. [e; "ox"]; 
								/ [CELL_SIZE]]]]; 
					:= [Y; math_floor [* [::. [e; "oy"]; 
								/ [CELL_SIZE]]]]; 
					= [rec; 0]; 
					text [control; PLAY_ICON]; 
					:= [is_alive; get_cell [cells; X; Y]]; 
					set_cell [cells; X; Y; 
						? [is_alive; 0; 1]]; 
					render [cells]]]]; 
		get_context ["2d"]]]; 
;; Canvas
 
|> [ctx; 
	fill_style [DEAD_COLOR]; 
	fill_rect [0; 0; SIZE; SIZE]]; 
;; Animation function
 
:= [step; -> [: [update_state []; 
			render [next]; 
			= [cells; next]; 
			= [next; 
				init [bounds]]]]]; 
:= [play; -> [time_set_timeout [-> [: [? [rec; 
						: [step []; 
							play []]]]]; 150]]]; 
;; Play / Pause UI
 
|> [:= [control; element ["bt"]]; 
	text [PLAY_ICON]; 
	click [-> [: [text [control; 
					? [= [rec; 
							! [rec]]; PAUSE_ICON; PLAY_ICON]]; 
				play []]]]; 
	attach [|> [element ["div"]; 
			attach [root]]]];