# -*- coding: UTF-8 -*-
from flask import Flask, request, render_template, make_response

from global_var import gl
from knowledge_base import knowledge_base_init, knowledge_data_base_init
from product_profile import build_test_datas
from json import dumps

# import pyorient

app = Flask(__name__)


def gloabal_var_init(product='汽车'):
    gl.set_value('PRODUCT', product)
    gl.set_value('KNOWLEDGE_BASE', knowledge_base_init(product))


@app.route('/index', methods=['GET', 'POST'])
def home():
    return render_template('home.html')

@app.route('/analysis_test',methods=['GET','POST'])
def analysis():
    product = gl.get_value("PRODUCT", '汽车')
    return render_template("reviewAnalysis.html", product=product)

@app.route('/results',methods=['GET','POST'])
def analysis_test():
    from product_profile import test
    target_freq=test()
    return dumps(target_freq)

@app.route('/knowledge_graph_test', methods=['GET', 'POST'])
def knowledge_graph():
    product = gl.get_value("PRODUCT", '汽车')
    return render_template("knowledgeGraph.html", product=product)


@app.route('/knowledge_base', methods=['GET', 'POST'])
def kb_graph():
    entity = request.args.get('entity')
    attribute = request.args.get('attribute')
    knowledge_base = gl.get_value('KNOWLEDGE_BASE')
    if entity == '0':
        entity = None
    if attribute == '0':
        attribute = None
    if entity is None:
        entity = knowledge_base.productName
    knowledge_base.write_whole_part_info(entity)
    resp = make_response(
        render_template('knowledge_base.html', ent=entity, attr=attribute, product=gl.get_value('PRODUCT', '汽车')))
    resp.cache_control.max_age = -1

    return resp

def orient_test():
    import random, time
    kb = knowledge_base_init()
    db = knowledge_data_base_init(db_type='remote')
    word_list = list(kb.entitySet) + list(kb.attributeSet) + list(kb.descriptionSet) + [x.name for x in db.client.query(
        "select name from EntitySyn", -1)] + [x.name for x in db.client.query("select name from AttriSyn", -1)]
    test_case = 100
    random_word = random.sample(word_list * (1 + int(test_case / len(word_list))), test_case)
    start_time = time.time()
    hit_count = 0
    for word in random_word:
        flag = 0
        flag = flag + (1 if kb.have_entity(word, True) else 0)
        flag = flag + (1 if kb.have_attribute(word, True) else 0)
        flag = flag + (1 if kb.have_description(word) else 0)
        flag = flag + (1 if kb.have_target(word, True) else 0)
        if flag == 0:
            print('kb error for word: %s' % word)
        hit_count = hit_count + flag
    end_time = time.time()
    print('kb test %d node query, hit %d, time use: %f' % (4 * test_case, hit_count, end_time - start_time))

    start_time = time.time()
    hit_count = 0
    for word in random_word:
        flag = 0
        flag = flag + (1 if db.have_entity(word, True) else 0)
        flag = flag + (1 if db.have_attribute(word, True) else 0)
        flag = flag + (1 if db.have_description(word) else 0)
        flag = flag + (1 if db.have_target(word, True) else 0)
        if flag == 0:
            print('kb error for word: %s' % word)
        hit_count = hit_count + flag
    end_time = time.time()
    print('db remote test %d node query, hit %d, time use: %f' % (4 * test_case, hit_count, end_time - start_time))

    db.client.db_close()
    db = knowledge_data_base_init(db_type='local')

    start_time = time.time()
    hit_count = 0
    for word in random_word:
        flag = 0
        flag = flag + (1 if db.have_entity(word, True) else 0)
        flag = flag + (1 if db.have_attribute(word, True) else 0)
        flag = flag + (1 if db.have_description(word) else 0)
        flag = flag + (1 if db.have_target(word, True) else 0)
        if flag == 0:
            print('kb error for word: %s' % word)
        hit_count = hit_count + flag
    end_time = time.time()
    print('db local test %d node query, hit %d, time use: %f' % (4 * test_case, hit_count, end_time - start_time))


if __name__ == '__main__':
    print('Server is running')
    gloabal_var_init()
    EA, SA = build_test_datas()
    # orient_test()
    app.run(host='0.0.0.0', debug=False, port=5001, threaded=True)  # debug=True
