# -*- coding: UTF-8 -*-
import sys
from flask import Flask, request, render_template, make_response
from werkzeug.utils import secure_filename
from global_var import gl
from knowledge_base import knowledge_base_init, knowledge_data_base_init
from SentimentAnalysisModule.preprocess import WordSet, WordEmbedding, KnowledgeBase
from product_profile import build_test_datas, single_analysis
from new_fine_grained import ltp_init
from json import dumps
import os
import pickle as pkl

# import pyorient

app = Flask(__name__)
app.config['UPLOAD_FOLDER'] = './uploads'
app.config['CACHE_FOLDER'] = './caches'


def gloabal_var_init(product='汽车'):
    gl.set_value('PRODUCT', product)
    gl.set_value('KNOWLEDGE_BASE', knowledge_base_init(product))
    ltp_init()
    if not os.path.exists(app.config['UPLOAD_FOLDER']):
        os.makedirs(app.config['UPLOAD_FOLDER'])
    if not os.path.exists(app.config['CACHE_FOLDER']):
        os.makedirs(app.config['CACHE_FOLDER'])


@app.route('/index', methods=['GET', 'POST'])
def home():
    return render_template('home.html')


@app.route('/index_test', methods=['GET', 'POST'])
def indexs():
    return render_template('index.html')


def file_hash(file_path):
    import hashlib
    md5 = hashlib.md5()
    buf_size = 65536
    with open(file_path, 'rb') as f:
        while True:
            data = f.read(buf_size)
            if not data:
                break
            md5.update(data)
    return md5


def result_from_cache(file_name):
    md5 = file_hash(os.path.join(app.config['UPLOAD_FOLDER'], file_name))
    cache_path = os.path.join(app.config['CACHE_FOLDER'], md5.hexdigest() + '.pkl')
    if os.path.exists(cache_path):
        with open(cache_path, 'rb') as f:
            result = pkl.load(f)
    else:
        from product_profile import batch_analysis
        with open(os.path.join(app.config['UPLOAD_FOLDER'], file_name), encoding='utf8') as f:
            texts = f.read()
        target_freq = batch_analysis(texts)
        result = dumps(target_freq)
        with open(cache_path, 'wb') as f:
            pkl.dump(result, f)
    return result


@app.route('/analysis', methods=['GET', 'POST'])
def analysis():
    batchResult = None
    singleResult = None
    if request.method == 'POST':
        if 'upload' in request.files and request.files['upload'].filename != ' ':
            upload_file = request.files['upload']
            file_name = secure_filename(upload_file.filename)
            upload_file.save(os.path.join(app.config['UPLOAD_FOLDER'], file_name))
            batchResult = result_from_cache(file_name)
        if 'review' in request.form and request.form['review'] != '':
            review = request.form['review']
            sentiments = single_analysis(review)
            singleResult = dumps(sentiments)
    product = gl.get_value("PRODUCT", '汽车')
    return render_template("reviewAnalysis.html", product=product, batchResult=batchResult, singleResult=singleResult)


@app.route('/analysis_test', methods=['GET', 'POST'])
def analysis_test():
    batchResult = None
    if request.method == 'POST':
        from product_profile import batch_test
        target_freq = batch_test()
        batchResult = dumps(target_freq)
    product = gl.get_value("PRODUCT", '汽车')
    return render_template("reviewAnalysis.html", product=product, batchResult=batchResult)


@app.route('/knowledge_graph', methods=['GET', 'POST'])
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


@app.route('/antd', methods=['GET', 'POST'])
def antd_test():
    return render_template('antdTest.html')


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
    # EA, SA = build_test_datas()
    # orient_test()
    # analysis_test1()
    app.run(host='0.0.0.0', debug=False, port=5001, threaded=True)  # debug=True
