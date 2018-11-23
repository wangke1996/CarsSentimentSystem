/**
 * Created by 王颗 on 2018/11/21.
 */
function knowledgeQuery(path) {
    loadJS(path + '/allWords.js');
    allEntity = JSON.parse(unescapeHTML(allEntity));
    allEntitySynonym = JSON.parse(unescapeHTML(allEntitySynonym));
    allAttribute = JSON.parse(unescapeHTML(allAttribute));
    allAttributeSynonym = JSON.parse(unescapeHTML(allAttributeSynonym));
    allDescription = JSON.parse(unescapeHTML(allDescription));

    var currentFocus;
    var Query = d3.select("#query").on("input", inputChange).on("keydown", chooseCandidate);
    var inputBox = document.getElementById("query");
    document.addEventListener("click", function (e) {
        closeAllLists(e.target);
    });

    function inputChange() {
        var a, i, val = this.value;
        /*close any already open lists of autocompleted values*/
        closeAllLists();
        if (!val) {
            return false;
        }
        currentFocus = -1;
        /*create a DIV element that will contain the items (values):*/
        a = document.createElement("DIV");
        a.setAttribute("id", this.id + "autocomplete-list");
        a.setAttribute("class", "autocomplete-items");
        /*append the DIV element as a child of the autocomplete container:*/
        this.parentNode.appendChild(a);
        /*for each item in the array...*/
        for (i in allEntity) {
            var b = creatAutoCompleteChild(allEntity[i], val, '实体');
            if (b != null)
                a.appendChild(b);
        }
        for (i in allEntitySynonym) {
            var b = creatAutoCompleteChild(i, val, '实体 '+allEntitySynonym[i]+' 的同义词',allEntitySynonym[i]);
            if (b != null)
                a.appendChild(b);
        }
        for (i in allAttribute) {
            var b = creatAutoCompleteChild(allAttribute[i], val, '属性');
            if (b != null)
                a.appendChild(b);
        }
        for (i in allAttributeSynonym) {
            var b = creatAutoCompleteChild(i, val, '属性 '+allAttributeSynonym[i]+' 的同义词',allAttributeSynonym[i]);
            if (b != null)
                a.appendChild(b);
        }
        for (i in allDescription) {
            var b = creatAutoCompleteChild(allDescription[i], val, '描述词');
            if (b != null)
                a.appendChild(b);
        }
    }

    function chooseCandidate() {
        var x = document.getElementById(this.id + "autocomplete-list");
        if (x) x = x.getElementsByTagName("div");
        if (d3.event.keyCode == 40) {
            /*If the arrow DOWN key is pressed,
             increase the currentFocus variable:*/
            currentFocus++;
            /*and and make the current item more visible:*/
            addActive(x);
        }
        else if (d3.event.keyCode == 38) { //up
            /*If the arrow UP key is pressed,
             decrease the currentFocus variable:*/
            currentFocus--;
            /*and and make the current item more visible:*/
            addActive(x);
        } else if (d3.event.keyCode == 13) {
            /*If the ENTER key is pressed, prevent the form from being submitted,*/
            d3.event.preventDefault();
            if (currentFocus > -1) {
                /*and simulate a click on the "active" item:*/
                if (x) x[currentFocus].click();
            }
        }
    }

    function addActive(x) {
        /*a function to classify an item as "active":*/
        if (!x) return false;
        /*start by removing the "active" class on all items:*/
        removeActive(x);
        if (currentFocus >= x.length) currentFocus = 0;
        if (currentFocus < 0) currentFocus = (x.length - 1);
        /*add class "autocomplete-active":*/
        x[currentFocus].classList.add("autocomplete-active");
    }

    function removeActive(x) {
        /*a function to remove the "active" class from all autocomplete items:*/
        for (var i = 0; i < x.length; i++) {
            x[i].classList.remove("autocomplete-active");
        }
    }

    function closeAllLists(element) {
        /*close all autocomplete lists in the document,
         except the one passed as an argument:*/
        var x = document.getElementsByClassName("autocomplete-items");
        for (var i = 0; i < x.length; i++) {
            if (element != x[i] && element != Query) {
                x[i].parentNode.removeChild(x[i]);
            }
        }
    }

    function getIndexOfEachCharacter(word, chars) {
        var flag = true;
        var indexes = [];
        for (j in chars) {
            var index = word.toUpperCase().indexOf(chars[j].toUpperCase());
            if (index == -1) {
                flag = false;
                break;
            }
            indexes[j] = index;
        }
        if (flag) {
            indexes = indexes.filter((v, k, a) => a.indexOf(v) === k);
            indexes.sort();
            return indexes;
        }
        else
            return null;
    }

    function creatAutoCompleteChild(word, chars, type, origin=null) {
        var j;
        var indexes = getIndexOfEachCharacter(word, chars);
        if (indexes == null)
            return null;
        /*create a DIV element for each matching element:*/
        b = document.createElement("DIV");
        /*make the matching letters bold:*/
        indexes[indexes.length] = word.length;
        b.innerHTML = word.substr(0, indexes[0]);
        for (j = 0; j < indexes.length - 1; j++) {
            b.innerHTML += '<strong>' + word[indexes[j]] + '</strong>';
            b.innerHTML += word.substr(indexes[j] + 1, indexes[j + 1] - indexes[j] - 1);
        }
        b.innerHTML += "<span>" + type + "</span>";
        /*insert a input field that will hold the current array item's value:*/
        b.innerHTML += "<input type='hidden' value='" + word + "'>";
        b.addEventListener("click", function (e) {
            /*insert the value for the autocomplete text field:*/
            if(origin==null)
                inputBox.value = this.getElementsByTagName("input")[0].value;
            else
                inputBox.value=origin;
            /*close the list of autocompleted values,
             (or any other open lists of autocompleted values:*/
            closeAllLists();
        });
        return b;
    }


}
function submitQuery(path) {
    // d3.event.preventDefault();
    knowledge_graph(document.getElementById("query").value, path);
    // d3.selectAll("g.node").data([]).exit().remove();
    // d3.selectAll(".link").data([]).exit().remove();
    //ul.selectAll(".li").data([]).exit().remove();
}