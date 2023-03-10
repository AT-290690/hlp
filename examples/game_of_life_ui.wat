<- [SKETCH; MATH; DOM; EVENT; STYLE] [LIBRARY]; 
<- [make_scene; make_group; make_rectangle; update; play; draw; 
    insert_into_group; background; width; height; set_position;
    set_fill; set_stroke; no_fill; no_stroke] [SKETCH]; 
<- [random_int] [MATH];
<- [set_style; make_user_interface; make_button; make_container; set_text_content] [DOM];
<- [on_mouse_click] [EVENT];
<- [cursor_pointer; padding; text_color; units_pixel; background_color; border] [STYLE];

' [view; next; alive; x; y];

:= [W; 415; H; 415;
    N; 20; 
    factor; 1; 
    r; * [N; factor];
    h; * [r; factor; -1];
    COLORS; .: [ "#ccc"; 0]; 
    cols; N; rows; N; cells; .: []; 
    bound; - [* [rows; cols]; 1];
    get_cell; -> [x; y; ^ [cells; + [x; * [rows; y]]]]; 

  make_grid; -> [cells; : [
:= [cells_container; make_group []]; 

*loop [bound; -> [count; : [
  ? [! [% [count; cols]]; += [h; r]]; 
  := [is_alive; random_int [0; 1];
      next_is_alive; random_int [0; 1]; 
      rect; |> [make_rectangle [% [* [count; r]; * [r; cols]]; h; r; r]; 
        set_fill [^ [COLORS; is_alive]];
        no_stroke []];
      cell; :: [alive; is_alive;
                next; next_is_alive;
                view; rect]]; 
  insert_into_group [cells_container; rect]; 
  .:append [cells; cell]; 
  ]]]; cells_container]];

iterate_cells; -> [cells; callback; : [
:= [y; -1]; 
>> [cells; -> [cell; i; cells; : [
  = [y; ? [% [i; rows]; 
  y; += [y]]]; 
  := [x; % [i; cols]; 
      cell; get_cell [x; y]]; 
  callback [cell; x; y]]]]]]; 

directions; .: [
  :: [x; 0; y; 1]; 
  :: [x; 1; y; 0]; 
  :: [x; -1; y; 0]; 
  :: [x; 0; y; -1]; 
  :: [x; 1; y; -1]; 
  :: [x; -1; y; -1]; 
  :: [x; 1; y; 1]; 
  :: [x; -1; y; 1]]; 

adjacent; -> [x1; y1; : [
:= [sum; 0]; 
>> [directions; -> [dir; : [
  := [cell; get_cell [
    + [x1; . [dir; x]]; 
    + [y1; . [dir; y]]]]; 
  = [sum; + [sum; ? [cell; . [cell; alive]; 0]]]]]]; sum]];

update_state; -> [iterate_cells [cells; -> [cell; x; y; : [
  := [is_alive; . [cell; alive]; 
  neighbors; adjacent [x; y]]; 
  ? [&& [is_alive; < [neighbors; 2]]; 
    .= [cell; next; 0]; 
      ? [&& [is_alive; > [neighbors; 3]]; 
        .= [cell; next; 0]; 
           ? [&& [! [is_alive]; 
             == [neighbors; 3]]; 
  .= [cell; next; 1]]]]]]]]; 

 trottle; -> [delta; value; callback; 
             ? [! [% [delta; value]]; 
                       callback []]];

render; -> [iterate_cells [cells; -> [cell; x; y; : [
  := [is_alive; . [cell; alive]]; 
  set_fill [. [cell; view]; ^ [COLORS; is_alive]]; 
  .= [cell; alive; . [cell; next]]]]]]]; 

make_scene [W; H; -> [: [
 |> [cells; 
    make_grid []; 
    set_position [N; N]];
  draw [0; -> [delta; fps; trottle [delta; 8; -> [: [
    update_state []; 
    render []]]]]]; 
  play []]]];

make_user_interface [];
make_container [|> [
  make_button [];
  set_text_content["RESTART"];
  set_style [cursor_pointer []; 
  background_color ["#000"]; 
  text_color ["#fff"]];
  on_mouse_click [-> [
    >> [cells;  -> [current; : [
    .= [current; alive; random_int [0; 1]];
    .= [current; next; random_int [0; 1]]]]]]]]];