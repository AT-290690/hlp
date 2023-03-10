<- [SKETCH; COLOR; EVENT; DOM] [LIBRARY];
<- [make_scene; background; VECTOR; get_position;
  set_scale;  sprite_play; make_texture; sprite_pause; make_sprite; set_rotation; set_screen_size; set_origin; make_group; UTILS] [SKETCH];
<- [make_rgb_color] [COLOR];
<- [make_grid; CANVAS] [UTILS];
<- [on_key_down; on_key_up] [EVENT];
<- [get_body] [DOM];
<- [add_self; make_vector; set_length; multiply; multiply_self;
    LEFT; RIGHT; UP; DOWN] [VECTOR];
' [w; s; a; d];
:= [moving; 0; directions; |> [
    .: [UP []; DOWN []; LEFT []; RIGHT []]; 
    .:map>> [-> [vec; f; m; multiply_self [vec; 3]]]]];
make_scene [500; 500; -> [: [
:= [src; "https://i.imgur.com/G2zkd5t.png"];
 background ["#ddd"];
 := [cols; 12; rows; 4; rate; 18];
 := [drifter; |> [
   make_sprite [src; 250; 120; cols; rows; rate; 0]; 
   set_scale [1.7]]]; 
 := [pos; get_position [drifter]];
 := [animate_move; -> [dir; sprite_play [drifter; * [12; dir]; - [* [12; + [dir; 1]]; 1]]]];
 := [move; -> [dir; : [
  ? [!= [moving; dir]; animate_move [dir]];
   = [moving; dir];
  |> [pos; add_self [^ [directions; dir]]]]]];
 := [stop; -> [: [sprite_pause [drifter]; = [moving; -1]]]];
 := [body; get_body []];
  on_key_down [body; -> [key; : [
   ? [== [key; w]; move [0]];
   ? [== [key; s]; move [1]];
   ? [== [key; a]; move [2]];
   ? [== [key; d]; move [3]]]]]; 
  on_key_up [body; -> [key; stop []]]]]; CANVAS []];
make_grid [20; 15];
