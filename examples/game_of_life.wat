;; window
<- [SKETCH; MATH] [LIBRARY]; 
<- [make_scene; make_group; make_rectangle; update; play; draw; 
    insert_into_group; background; width; height; set_position;
    set_fill; set_stroke; no_fill; no_stroke] [SKETCH]; 
<- [random_int] [MATH];

' [view; next; alive; x; y];

:= [W; 415; H; 415;
    lifespan; 1000; 
    N; 20; 
    factor; 1; 
    r; * [N; factor];
    h; * [r; factor; -1];
    COLORS; .: [ "#ccc"; 0]; 
    cols; N; rows; N; cells; .: []; 

    get_cell; -> [x; y; ^ [cells; + [x; * [rows; y]]]]; 

  make_grid; -> [cells; : [
:= [cells_container; make_group []]; 

~= [loop; -> [count; bounds; : [
  ? [! [% [count; cols]]; += [h; r]]; 
  ' [x; y];
  := [is_alive; random_int [0; 1];
      next_is_alive; random_int [0; 1]; 
      rect; |> [make_rectangle [% [* [count; r]; * [r; cols]]; h; r; r]; 
      set_fill [^ [COLORS; is_alive]];
      no_stroke []];
      cell; :: [alive; is_alive;
                next; next_is_alive;
                view; rect]]; 
  insert_into_group [cells_container; rect]; 
  .: append [cells; cell]; 
  ? [> [bounds; count]; loop [+= [count]; bounds]]]]];
loop [0; - [* [rows; cols]; 1]]; cells_container]];

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

adjacent; -> [X; Y; : [
:= [sum; 0]; 
>> [directions; -> [dir; : [
  := [cell; get_cell [
    + [X; . [dir; x]]; 
    + [Y; . [dir; y]]]]; 
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

trottle; -> [delta; value; callback; ? [! [% [delta; value]]; callback []]];

render; -> [iterate_cells [cells; -> [cell; x; y; : [
  := [is_alive; . [cell; alive]]; 
  set_fill [. [cell; view]; ^ [COLORS; is_alive]]; 
  .= [cell; alive; . [cell; next]]]]]]]; 

make_scene [W; H; -> [: [
 |> [cells; 
    make_grid []; 
    set_position [N; N]];
  draw [lifespan; -> [delta; fps; trottle [delta; 8; -> [: [
    update_state []; 
    render []]]]]]; 
  play []]]];
