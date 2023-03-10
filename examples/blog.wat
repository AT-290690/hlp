;; app
<- [DOM; STYLE; HTTP] [LIBRARY];
<- [set_style; set_attribute; make_header; make_iframe; add_text_content;  make_container; make_anchor; get_body; make_pre;
insert_into_container; make_strong_text; make_css_link; make_nav;  make_paragraph; make_figure; make_image; make_time; make_italic_text;
  make_user_interface;  make_span] [DOM];
<- [add_class; background_color; text_align] [STYLE];

make_user_interface [];
make_css_link ["https://cdn.jsdelivr.net/npm/bulma*loop0.9.4/css/bulma.min.css"];
|> [get _body []; set_style [background_color ["white"]; text_align ["l"]]];
   
      := [
      content_title; "My title"; 
      content_subtitle; "subtitle of mine";
      content_author; "me";
      content_git; "my.git.com";
      content_exposition; .: ["content"; "bbabababa"; "bla bla bla bla"; "daskdjdfkj4"];
      content_goal; .: ["3214"; "bbaba324324baba"; "bla bla bl42342a bla"; "daskd234234jdfkj3"];
      content_explanation; .: ["3214"; "bbaba324324baba"; "bla bla bl42342a bla"; "daskd234234jdfkj2"];
      content_arithmetic; .: ["3232423414"; "bbaba324324baba"; "bla bla bl42342a bla"; "daskd2344444234jdfkj1"];
      content_source; .: ["234234"; "bbaba324324baba"; "bla bla bl42342a bla"; "daskd234234j434dfkj0"];];
   
  |> [make_container [
    |> [make_container [
      |> [make_container [
        |> [make_container [
          |> [make_nav [
            |> [make_container [
                |> [make_anchor ["https://github.com/AT-290690"];
                  insert_into_container [
                    |> [make_image ["https://at-290690.github.io/brrr/playground/assets/images/thunder.svg"]]; 
                    |> [make_container [
              |> [make_paragraph []; 
              add_text_content [content_title];
              add_class ["title"]; 
              add_class ["is-3"]];
             |> [make_paragraph []; 
              add_text_content [content_subtitle];
              add_class ["subtitle"]; 
              add_class ["is-6"]]];
             add_class ["column"]]]; 
                  add_class ["navbar-item"]]];
                add_class ["navbar-brand"]]]; 
              add_class ["navbar"]; 
              set_attribute ["role"; "navigation"]]]];
        
        |> [make_container [
          |> [make_container [
            |> [make_container [
              |> [make_figure [
              make_image ["https://pbs.twimg.com/profile_images/1478096650967072776/nxtzxgoX_400x400.jpg"]];
            add_class ["image"]; add_class ["is-96x96"]]];
          add_class ["media-left"]];
            |> [make_container [
              |> [make_paragraph []; 
                  add_text_content [content_author]; 
                  add_class ["title"]; 
                  add_class ["is-5"]];
              |> [make_anchor ["https://github.com/AT-290690"]; 
                  add_text_content [content_git]; 
                  add_class ["subtitle"]; 
                  add_class ["is-6"]]];
                add_class ["media-content"]]];
              add_class ["media"]];
      
          |> [make_container [
            add_text_content [make_paragraph []; ^ [content_exposition; 0]];
            add_text_content [make_strong_text []; ^ [content_exposition; 1]];
            
            make_paragraph [];
            
            add_text_content [make_paragraph []; ^ [content_exposition; 2]]; 
            add_text_content [make_paragraph []; ^ [content_goal; 0]];
            add_text_content [make_italic_text []; ^ [content_goal; 1]]; make_paragraph [];
            add_text_content [make_paragraph []; ^ [content_goal; 2]];
            
            make_paragraph [];
            
            add_text_content [make_paragraph []; ^ [content_goal; 3]];
            add_text_content [make_strong_text []; ^ [content_goal; 4]]; 
   |> [make_figure [
            make_image ["https://miro.medium.com/max/1400/1*ErCCPAEcI3Gh1R4My8n8lQ.webp"]];
            add_class ["image"];  add_class ["card-image"]];
  
       add_text_content [make_paragraph []; 
              ^ [content_explanation; 0]];
  
       add_text_content [make_paragraph []; 
              ^ [content_explanation; 1]];
    
   |> [make_figure [
            make_image ["https://miro.medium.com/max/1400/1*RiphOyRvYqkB4Z3Dv9PGgg.webp"]];
            add_class ["image"];  add_class ["card-image"]];
  
            
             add_text_content [make_paragraph []; 
           ^ [content_explanation; 2]];
  
            
   add_text_content [make_paragraph []; 
  ^ [content_explanation; 3]]; 
  insert_into_container [make_pre []; 
  add_text_content [make_paragraph []; ^ [content_arithmetic; 0]];
  add_text_content [make_paragraph []; ^ [content_arithmetic; 1]];
  add_text_content [make_paragraph []; ^ [content_arithmetic; 2]];
  add_text_content [make_paragraph []; ^ [content_arithmetic; 3]];
  add_text_content [make_paragraph []; ^ [content_arithmetic; 4]];
  add_text_content [make_paragraph []; ^ [content_arithmetic; 5]];
  add_text_content [make_paragraph []; ^ [content_arithmetic; 6]];
  add_text_content [make_paragraph []; ^ [content_arithmetic; 7]];
  add_text_content [make_paragraph []; ^ [content_arithmetic; 8]];
  add_text_content [make_paragraph []; ^ [content_arithmetic; 9]];
  add_text_content [make_paragraph []; ^ [content_arithmetic; 10]]];
  make_paragraph []]; 
              
    make_container [|> [make_figure [
    make_image ["https://user-images.githubusercontent.com/88512646/189848001-5274f5bf-200d-46e3-80df-25c5718bfc4a.gif"]];
    add_class ["image"];  
    add_class ["card-image"]];
             
    add_text_content [make_italic_text []; ^ [content_arithmetic; 11]];
      make_paragraph [];
    |> [
    make_paragraph [];
    insert_into_container [
    add_text_content [make_italic_text []; ^ [content_arithmetic; 12]]]];
  
  
    |> [
    make_paragraph [];
    insert_into_container [
    add_text_content [make_strong_text []; ^ [content_arithmetic; 13]]]];
  
                    
    add_text_content [make_italic_text []; ^ [content_source; 0]]];
    add_class ["content"]];
  
    make_paragraph [];
          
     add_class [make_container [
               add_text_content [make_paragraph []; ^ [content_source; 1]];
             add_text_content [make_anchor ["https://github.com/AT-290690/brrr"]; ^ [content_source; 2]];
            add_text_content [make_paragraph [];  ^ [content_source; 3]
             ]];  add_class ["card-content"]]; 
          
       
        ]; 
           add_class ["card-content"]]];
          add_class ["card"]];
      
      |> [make_container [
        |> [make_container [
          |> [make_container [
            add_text_content [
              make_span []; 
              ^ [content_source; 4]]; 
              add_text_content [make_anchor ["https://monolith-q9u8.onrender.com"]; 
              " monolith"];
            make_paragraph [];
            add_text_content [
              make time ["2023-1-10"];
              "11:09 PM - 10 Jan 2023"]]; 
              add_class ["content"]]];
            add_class ["card-content"]]]; 
            add_class ["card"]]]; 
          add_class ["column"];
          add_class ["is-half"]]]; 
      add_class ["columns"];
      add_class ["is-centered"];
      add_class ["is-full"]];