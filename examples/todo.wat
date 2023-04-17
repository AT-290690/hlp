;; app
dom_load_bulma [0; 9; 4]; 
aliases = [
    element; dom_create_element; 
    value; dom_get_value;
    set; dom_set_attribute;
    get; dom_get_attribute;
    class; dom_add_class; 
    style; dom_set_style;
    text; dom_set_text_content;
    attach; dom_append_to;
    detach; dom_detach;
    clear; dom_clear;
    add; dom_add_to_box;
    box; dom_box;
    click; dom_click
];
:= [root; |> [dom_get_root []]];
:= [add_todo; -> [e; : [
                   attach [add [
                    |> [:= [component; 
                            element ["li"]]; 
                            class ["panel-block"]]; .: [
                              add [|> [element ["sp"]; 
                                       class ["panel-icon"]]; .: [
                                         |> [element ["sp"]; 
                                             text ["✔"]]]]; 
                                   |> [element ["sp"]; 
                                       text [value [todo_input]]; 
                                       class ["mr-2"]]; 
                                   |> [element ["bt"]; 
                                       class ["delete"];
                                       class ["is-pulled-right"]; 
                                       click [-> [dom_detach [component]]]]]]; 
                            todo_root];  
                     clear [todo_input]]]];
|> [box [.: [
    add [|> [element ["sc"];
             class ["section"]]; .: [
            box [.: [
              |> [element ["h1"]; 
                  class ["title"]; 
                  text ["To-Do List"]];
              |> [box [.: [
                |> [box [.: [
                    := [todo_input; |> [element ["ip"]; 
                                        class ["input"]; 
                                        set ["placeholder"; "Add a new task"]]]]]; 
                    class ["control"]; 
                    class ["is-expanded"]];
                |> [box [.: [
                    |> [element ["bt"]; 
                        class ["button"]; 
                        class ["is-primary"];
                        text ["Add"];
                        click [add_todo]]]];
                    class ["control"]]
                  ]]; 
                  class ["field"]; 
                  class ["has-addons"]];
             := [todo_root; |> [element ["ul"]; 
                                class ["panel"]]]]]]]]]; 
    attach [root]];






