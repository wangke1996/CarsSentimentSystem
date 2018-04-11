"""
网站Demo API模块
"""
# -*- coding: UTF-8 -*-
import os
import sys
import numpy as np
import imp
import json
import random
import global_var as gl
import matplotlib.pyplot as plt
import jieba
from PIL import Image
from wordcloud import WordCloud, STOPWORDS, ImageColorGenerator

# width,height,margin可以设置图片属性

# generate 可以对全部文本进行自动分词,但是他对中文支持不好,对中文的分词处理请看我的下一篇文章
# wordcloud = WordCloud(font_path = r'D:\Fonts\simkai.ttf').generate(f)
# 你可以通过font_path参数来设置字体集

# background_color参数为设置背景颜色,默认颜色为黑色




gl._init()
gl.set_value('PROGRESS', 0)  # 后端分析进度百分比
gl.set_value('STATE', 'free')
imp.reload(sys)
sys.path.append("..")
from flask import Flask, request, redirect, url_for
from flask import render_template
from flask_bootstrap import Bootstrap
from flask_wtf import FlaskForm
from flask_wtf.file import FileField
from flask_uploads import UploadSet, configure_uploads, TEXT, patch_request_class, UploadNotAllowed
from wtforms import SubmitField, TextAreaField
from collections import defaultdict
from werkzeug.utils import secure_filename
from fine_grained import init, analysis_comment
from summary import gen_summary
# 不显示server输出
import logging

log = logging.getLogger('werkzeug')
log.setLevel(logging.ERROR)

# from utils.misc_utils import get_args_info

basedir = os.path.abspath(os.path.dirname(__file__))

app = Flask(__name__)
bootstrap = Bootstrap(app)
app.config['SECRET_KEY'] = 'AIMindreader'
app.config['UPLOADED_TEXTS_DEST'] = './uploads'
UPLOAD_FOLDER = './uploads'
ALLOWED_EXTENSIONS = set(['txt'])

# _NAME = 'AI'
# _STAMP = get_args_info(_NAME)
# re_file = open('logs/' + _STAMP + '.txt', 'w')

texts = UploadSet('texts', TEXT)
configure_uploads(app, texts)
patch_request_class(app)  # 文件大小限制，默认为16MB

use_nn = False
init_data = init(use_nn=use_nn)

profile_tree = None
ent_attr_polar = None
ent_attr_text = None
ent_polar = None


def word_cloud_generate(upload_file_name, in_img_path=u'static/images/car.jpg',  font_path=r'static/fonts/wrjwb.ttf'):
    in_text_path = u'uploads/' + upload_file_name
    out_img_path = u'static/result_wordCloud/' + upload_file_name + '.png'
    f = open(in_text_path, 'r', encoding='utf8').read()
    coloring = np.array(Image.open(in_img_path))

    stopwords = set(STOPWORDS)
    stopwords.update(
        ["没有", "感觉", "可以", "现在", "公里", "就是", "比较", "应该", "大家", "左右", "居然", "不是", "还是", "不过", "空间", "一次", "什么", "不到",
         "那个", "东西", "这个", "一下", "这么", "怎么", "一直", "时候", "时间", "次", "之后", "店", "眼", "问题", "毛病", "地方", "原因", "感受", "现象",
         "事", "上", "下", "范围", "朋友", "缺点", "优点", "车友", "车主", "第一", "一点", "水平", "程度"])

    wordlist = jieba.cut(f, cut_all=True)
    wordlist = " ".join(wordlist)
    wordcloud = WordCloud(background_color="white", font_path=font_path, mask=coloring, stopwords=stopwords, width=1000,
                          height=860, margin=2).generate(wordlist)
    # image_colors = ImageColorGenerator(coloring)
    # plt.imshow(wordcloud, interpolation="bilinear")
    # plt.axis("off")
    # plt.show()

    wordcloud.to_file(out_img_path)


def knowledge_base_init():
    entity_pair, entity_level = read_aspect_file('./KnowledgeBase/whole-part.txt')
    entity_attr, _ = read_aspect_file('./KnowledgeBase/entity-attribute.txt', entity_level)
    entity_synonym, _ = read_aspect_file('./KnowledgeBase/entity-synonym.txt', entity_level)
    attr_synonym, _ = read_aspect_file('./KnowledgeBase/attribute-synonym.txt')
    opinion_pair = read_opinion_file('./KnowledgeBase/attribute-description.txt')
    entity_tree = {'name': '汽车', 'child': [], 'id': 1, 'type': 'entity'}
    kb_build_entity(entity_tree, entity_pair, 1)
    gl.set_value('ENTITY_PAIR', entity_pair)
    gl.set_value('ENTITY_LEVEL', entity_level)
    gl.set_value('ENTITY_ATTRIBUTE', entity_attr)
    gl.set_value('ENTITY_SYNONYM', entity_synonym)
    gl.set_value('ATTRIBUTE_SYNONYM', attr_synonym)
    gl.set_value('OPINION_PAIR', opinion_pair)
    gl.set_value('ENTITY_TREE', entity_tree)

def knowledge_graph():
    subset={'汽车','发动机','底盘','车身','电气设备','进气系统','排气系统','燃料供给系统','整体','质量','油耗','动力','性能','好','高','不错','强劲','适中','中庸','粗糙','差','微弱'}
    links={'entity_entity':[],'entity_attribute':[],'entity_synonym':[],'attribute_synonym':[],'attribute_opinion':[]}
    nodes=dict()
    attribute_level=5
    opinion_level=6
    # entity-entity
    entity_pair=gl.get_value('ENTITY_PAIR',None)
    if entity_pair is None:
        knowledge_base_init()
        entity_pair=gl.get_value('ENTITY_PAIR')
    for parent,child,parent_level in entity_pair:
        if parent not in subset or child not in subset:
            continue
        links['entity_entity'].append({'source':parent,'target':child,'type':'is part of','source_level':parent_level,'target_level':parent_level+1})
        if nodes.get(parent,None) is None:
            nodes[parent]={'name':parent,'type':'entity','level':parent_level}
        if nodes.get(child,None) is None:
            nodes[child]={'name':child,'type':'entity','level':parent_level+1}
    # entity-attribute
    entity_attribute=gl.get_value('ENTITY_ATTRIBUTE')
    for entity,attribute,_ in entity_attribute:
        if entity not in subset or attribute not in subset:
            continue
        links['entity_attribute'].append({'source':entity,'target':attribute,'type':'is an attribute of','source_level':nodes[entity]['level'],'target_level':attribute_level})
        if nodes.get(attribute,None) is None:
            nodes[attribute]={'name':attribute,'type':'attribute','level':attribute_level}
    # entity-synonym
    entity_synonym=gl.get_value('ENTITY_SYNONYM')
    for entity, synonym, _ in entity_synonym:
        if entity in subset and nodes.get(synonym, None) is None:
            entity_level=nodes[entity]['level']
            links['entity_synonym'].append({'source':entity,'target':synonym,'type':'is the same as','source_level':entity_level,'target_level':entity_level+1})
            nodes[synonym]={'name':synonym,'type':'entity_synonym','level':entity_level+1}
    # attribute-synonym
    attribute_synonym=gl.get_value('ATTRIBUTE_SYNONYM')
    for attribute, synonym, _ in attribute_synonym:
        if attribute in subset and nodes.get(synonym, None) is None:
            links['attribute_synonym'].append({'source':attribute,'target':synonym,'type':'is the same as','source_level':attribute_level,'target_level':attribute_level+1})
            nodes[synonym]={'name':synonym,'type':'attribute_synonym','level':attribute_level+1}
    # attribute-opinion
    opinion_pair=gl.get_value('OPINION_PAIR')
    for attribute, opinion, polar in opinion_pair:
        if attribute not in subset or opinion not in subset:
            continue
        type=None
        if polar==1:
            type='positive describe'
        elif polar==-1:
            type='negative describe'
        else:
            type='neutral describe'
        links['attribute_opinion'].append({'source': attribute,'target':opinion,'type':'is a '+type+' of','source_level':attribute_level,'target_level':opinion_level})
        if nodes.get(opinion,None) is None:
            nodes[opinion]={'name':opinion,'type':type,'level':opinion_level}
    gl.set_value('KNOWLEDGE_GRAPH_LINKS',links)
    gl.set_value('KNOWLEDGE_GRAPH_NODES',nodes)
    #if not os.path.exists('static/kb_json/part_of_knowledgebase.js'):
    file = open('static/kb_json/part_of_knowledgebase.js', 'wb')
    file.write(('links_kb_subset=\'' + json.dumps(links) + '\';\nnodes_kb_subset=\'' + json.dumps(nodes) + '\';').replace('\\"', '\\\\"').encode('utf-8'))
    file.close()


def kb_build_entity(node, entity_pair, id):
    for parent, child, _ in entity_pair:
        if parent == node['name']:
            id = id + 1
            node['child'].append({'name': child, 'child': [], 'id': id, 'type': 'entity'})
    for child in node['child']:
        id = kb_build_entity(child, entity_pair, id)
    return id


def kb_build_level2(lv1_lv2, root_name, lv1_type, lv2_type):
    root = {'name': root_name, 'child': [], 'id': 1, 'type': lv1_type}
    id = 1
    for lv1, lv2, _ in lv1_lv2:
        if lv1 != root_name:
            continue
        children = root['child']
        if lv2 not in children:
            id = id + 1
            children.append({'name': lv2, 'child': [], 'id': id, 'type': lv2_type})
    return root


def kb_build_attr_opnion(attr_opinion, attr_name):
    root = {'name': attr_name, 'child': [], 'id': 1, 'type': 'attribute'}
    pos_node = {'name': '正向描述', 'child': [], 'id': 2, 'type': 'describe'}
    neu_node = {'name': '中性描述', 'child': [], 'id': 3, 'type': 'describe'}
    neg_node = {'name': '负向描述', 'child': [], 'id': 4, 'type': 'describe'}
    id = 4
    for attr, opinion, polar in attr_opinion:
        if attr != attr_name:
            continue
        id = id + 1
        if polar == 1:
            pos_node['child'].append({'name': opinion, 'child': [], 'id': id, 'type': 'opinion', 'polar': 1})
        elif polar == -1:
            neg_node['child'].append({'name': opinion, 'child': [], 'id': id, 'type': 'opinion', 'polar': -1})
        else:
            neu_node['child'].append({'name': opinion, 'child': [], 'id': id, 'type': 'opinion', 'polar': 0})
    root['child'].append(pos_node)
    root['child'].append(neu_node)
    root['child'].append(neg_node)
    return root


@app.route('/index', methods=['GET', 'POST'])
def home():
    return render_template('home.html')


@app.route('/contact', methods=['GET', 'POST'])
def contact():
    return render_template('contact.html')


@app.route('/introduction', methods=['GET', 'POST'])
def introduction():
    #if not os.path.exists('static/kb_json/part_of_knowledgebase.js'):
    knowledge_graph()
    return render_template('introduction.html')


@app.route('/knowledge_base', methods=['GET', 'POST'])
def kb_graph():
    ent = request.args.get('entity')
    attr = request.args.get('attribute')
    if ent is None:
        ent = '0'
    if attr is None:
        attr = '0'
    entity_tree = gl.get_value('ENTITY_TREE', None)
    if entity_tree is None:
        knowledge_base_init()
        entity_tree = gl.get_value('ENTITY_TREE')
    if not os.path.exists('static/kb_json/whole_part.js'):
        file = open('static/kb_json/whole_part.js', 'wb')
        file.write(('whole_part=\'' + json.dumps(entity_tree) + '\';').replace('\\"', '\\\\"').encode('utf-8'))
        file.close()
    if ent != '0':
        if not os.path.exists('static/kb_json/' + ent + '.js'):
            ent_attr = kb_build_level2(gl.get_value('ENTITY_ATTRIBUTE'), ent, 'entity', 'attribute')
            ent_synonym = kb_build_level2(gl.get_value('ENTITY_SYNONYM'), ent, 'entity', 'entity_synonym')
            file = open('static/kb_json/' + ent + '.js', 'wb')
            file.write(('ent_attr=\'' + json.dumps(ent_attr) + '\';').replace('\\"', '\\\\"').encode('utf-8'))
            file.write(('ent_synonym=\'' + json.dumps(ent_synonym) + '\';').replace('\\"', '\\\\"').encode('utf-8'))
            file.close()
    else:
        ent = None
    if attr != '0':
        if not os.path.exists('static/kb_json/' + attr + '.js'):
            attr_opinion = kb_build_attr_opnion(gl.get_value('OPINION_PAIR'), attr)
            attr_synonym = kb_build_level2(gl.get_value('ATTRIBUTE_SYNONYM'), attr, 'attribute', 'attribute_synonym')
            file = open('static/kb_json/' + attr + '.js', 'wb')
            file.write(('attr_opinion=\'' + json.dumps(attr_opinion) + '\';').replace('\\"', '\\\\"').encode('utf-8'))
            file.write(('attr_synonym=\'' + json.dumps(attr_synonym) + '\';').replace('\\"', '\\\\"').encode('utf-8'))
            file.close()
    else:
        attr = None
    return render_template('knowledge_base.html', ent=ent, attr=attr)


@app.route('/getProfile', methods=['GET', 'POST'])
def get_profile():
    ent = request.args.get('ent')
    if ent is None:
        return 'Get a None entity!'
    if ent != '全部':
        ent_detail = build_attr_tree(ent, 15)
        file = open('static/result_json/' + gl.get_value('UPLOAD_FILE_PATH', None) + '_' + ent + '.js', 'wb')
        file.write(
            ('data[\'' + ent + '\']=\'' + json.dumps(ent_detail) + '\';').replace('\\"', '\\\\"').encode('utf-8'))
        file.close()
    gl.set_value('STATE', 'free')
    return 'succeed'


@app.route('/analysis', methods=['GET', 'POST'])
def analysis():
    ent = None
    type = request.args.get('type')
    if type == 'views':
        ent = '全部'
        gl.set_value('STATE', 'free')
    elif type == 'details':
        ent = request.args.get('name')
        ent_detail = build_attr_tree(ent, 15)
        file = open('static/result_json/' + gl.get_value('UPLOAD_FILE_PATH', None) + '_' + ent + '.js', 'wb')
        file.write(
            ('data[\'' + ent + '\']=\'' + json.dumps(ent_detail) + '\';').replace('\\"', '\\\\"').encode('utf-8'))
        file.close()
        gl.set_value('STATE', 'free')

    form = AnalysisForm()
    input_text = None
    upload_error = None
    single_results = None
    single_pairs = None
    global profile_tree

    entity_pair = gl.get_value('ENTITY_PAIR', None)
    if entity_pair is None:
        knowledge_base_init()
        entity_pair = gl.get_value('ENTITY_PAIR')
    entity_level = gl.get_value('ENTITY_LEVEL')
    if form.is_submitted():
        if form.submit_text.data:
            input_text = form.text.data
            sentiments, single_pairs = analysis_comment(text=input_text, debug=True, use_nn=use_nn, **init_data)
            # result_list = [sentiments]
            single_pairs = list(set([tuple(t) for t in single_pairs]))
            for entity, attr, describ, polar, text in single_pairs:
                print(entity + ' ' + attr + ' ' + describ + ' ' + str(polar) + ' ' + text)
            input_text = form.text.data
            single_results = single_analysis_results(single_pairs, entity_pair, entity_level)
        elif form.submit_file.data:
            try:
                filename = texts.save(form.file.data)
                gl.set_value('UPLOAD_FILE_PATH', filename)
                file_url = texts.url(filename)
                print(file_url)
                global ent_attr_polar, ent_attr_text
                gl.set_value('STATE', 'busy')
                ent_attr_polar, ent_attr_text, download_filepath = gen_summary(filename=filename, use_nn=use_nn,
                                                                               init_data=init_data)
                word_cloud_generate(filename)
                profile_tree = multi_analysis_result(entity_pair)
                gl.set_value('DOWNLOAD_FILE_PATH', 'downloads/' + download_filepath)
                file = open('static/result_json/' + filename + '.js', 'wb')
                file.write(('var data=new Array();\ndata[\'全部\']=\'' + json.dumps(profile_tree) + '\';').replace('\\"',
                                                                                                                 '\\\\"').encode(
                    'utf-8'))
                file.close()
                ent = None
            except UploadNotAllowed as una:
                upload_error = 'error!'
                print(una)

    return render_template('review_analysis.html', form=form,
                           input_text=input_text,
                           upload_error=upload_error,
                           download_filepath=gl.get_value('DOWNLOAD_FILE_PATH', None),
                           single_results=single_results, single_pairs=single_pairs,
                           upload_file_name=gl.get_value('UPLOAD_FILE_PATH', None),
                           profile_tree=profile_tree,
                           ent=ent)


@app.route('/get_progress', methods=['GET', 'POST'])
def get_progress():
    opt = request.args.get('opt')
    if opt == 'reset':
        gl.set_value('STATE', 'free')
        gl.set_value('PROGRESS', 0)
    return gl.get_value('STATE') + '-' + str(gl.get_value('PROGRESS'))


@app.route('/views', methods=['GET', 'POST'])
def menu():
    form = AnalysisForm()
    return render_template('review_analysis.html', form=form,
                           download_filepath=gl.get_value('DOWNLOAD_FILE_PATH', None),
                           upload_file_name=gl.get_value('UPLOAD_FILE_PATH', None), ent='全部')


@app.route('/details', methods=['GET', 'POST'])
def detail():
    form = AnalysisForm()
    ent = request.args.get('name')
    ent_detail = build_attr_tree(ent, 15)
    file = open('static/result_json/' + gl.get_value('UPLOAD_FILE_PATH', None) + '_' + ent + '.js', 'wb')
    file.write(('data[\'' + ent + '\']=\'' + json.dumps(ent_detail) + '\';').replace('\\"', '\\\\"').encode('utf-8'))
    file.close()
    return render_template('review_analysis.html', form=form,
                           download_filepath=gl.get_value('DOWNLOAD_FILE_PATH', None),
                           upload_file_name=gl.get_value('UPLOAD_FILE_PATH', None), ent=ent)


def build_attr_tree(ent, sample_num):
    global ent_polar, ent_attr_polar, ent_attr_text
    root = {'name': ent, 'id': 1, 'pos': ent_polar[ent][0], 'neu': ent_polar[ent][1], 'neg': ent_polar[ent][2],
            'child': [], 'type': 'entity'}
    id = 1
    for ent_attr, polar in ent_attr_polar.items():
        if ent != ent_attr.split('-')[0]:
            continue
        attr = ent_attr.split('-')[1]
        attr_node = {'name': attr, 'id': id + 1, 'pos': ent_attr_polar[ent_attr][0], 'neu': ent_attr_polar[ent_attr][1],
                     'neg': ent_attr_polar[ent_attr][2], 'child': [], 'type': 'attr'}
        pos_node = {'name': '正向评价', 'id': id + 2, 'pos': ent_attr_polar[ent_attr][0],
                    'neu': ent_attr_polar[ent_attr][1], 'neg': ent_attr_polar[ent_attr][2], 'child': [],
                    'type': 'sentiment_node'}
        neu_node = {'name': '中性评价', 'id': id + 3, 'pos': ent_attr_polar[ent_attr][0],
                    'neu': ent_attr_polar[ent_attr][1], 'neg': ent_attr_polar[ent_attr][2], 'child': [],
                    'type': 'sentiment_node'}
        neg_node = {'name': '负向评价', 'id': id + 4, 'pos': ent_attr_polar[ent_attr][0],
                    'neu': ent_attr_polar[ent_attr][1], 'neg': ent_attr_polar[ent_attr][2], 'child': [],
                    'type': 'sentiment_node'}
        id = id + 4
        pos_sentence = random.sample(ent_attr_text[ent_attr][0], min(sample_num, len(ent_attr_text[ent_attr][0])))
        for sentence in pos_sentence:
            id = id + 1
            node = {'name': sentence, 'id': id, 'pos': 0, 'neu': 0, 'neg': 0, 'child': [], 'type': 'sentence'}
            pos_node['child'].append(node)
        # pos_node['child'] = random.sample(pos_node['child'], min(sample_num, len(pos_node['child'])))
        neu_sentence = random.sample(ent_attr_text[ent_attr][1], min(sample_num, len(ent_attr_text[ent_attr][1])))
        for sentence in neu_sentence:
            id = id + 1
            node = {'name': sentence, 'id': id, 'pos': 0, 'neu': 0, 'neg': 0, 'child': [], 'type': 'sentence'}
            neu_node['child'].append(node)
        # neu_node['child'] = random.sample(neu_node['child'], min(sample_num, len(neu_node['child'])))
        neg_sentence = random.sample(ent_attr_text[ent_attr][2], min(sample_num, len(ent_attr_text[ent_attr][2])))
        for sentence in neg_sentence:
            id = id + 1
            node = {'name': sentence, 'id': id, 'pos': 0, 'neu': 0, 'neg': 0, 'child': [], 'type': 'sentence'}
            neg_node['child'].append(node)
        # neg_node['child'] = random.sample(neg_node['child'], min(sample_num, len(neg_node['child'])))
        attr_node['child'].append(pos_node)
        attr_node['child'].append(neu_node)
        attr_node['child'].append(neg_node)
        root['child'].append(attr_node)
    return root


class AnalysisForm(FlaskForm):
    text = TextAreaField('请输入待分析的单条评论：')
    submit_text = SubmitField('提交')

    file = FileField('请上传待分析的批量评论文件：')
    submit_file = SubmitField('提交')


class TrainingForm(FlaskForm):
    text = TextAreaField('请输入待分析的文本：')
    submit_text = SubmitField('提交')

    # text1 = TextAreaField('请输入训练用评论语料库：')
    # submit_text1 = SubmitField('提交')

    file = FileField('请上传待分析语料库文件：')
    submit_file = SubmitField('提交')

    aspect = FileField('aspect')
    submit_aspect = SubmitField('显示产品构成')

    # opinion=FileField('opinion')
    # file_aspect = FileField('请上传实体属性关系文件：')
    # submit_file_aspect = SubmitField('提交')
    #
    # file_entity_synonym = FileField('请上传实体本体库文件：')
    # submit_file_entity_synonym = SubmitField('提交')
    #
    # file_attr_synonym = FileField('请上传属性本体库文件：')
    # submit_file_attr_synonym = SubmitField('提交')

    # file_opinion_pair = FileField('请上传情感库文件：')
    # submit_file_opinion_pair=SubmitField('提交')


def read_aspect_file(file_path, entity_level=None):
    flag = False
    if entity_level is None:
        flag = True
    if flag:
        entity_level = dict()
    aspect_file = open(file_path, encoding='utf8')
    try:
        all_lines = aspect_file.readlines()
        aspect_pair = []
        for line in all_lines:
            aspects = line.split()
            if len(aspects) < 2:
                continue
            parent = aspects[0]
            if parent not in entity_level:
                entity_level[parent] = 1
            for child in aspects[1:len(aspects)]:
                aspect_pair.append([parent, child, entity_level[parent]])
                if flag and (child not in entity_level):
                    entity_level[child] = entity_level[parent] + 1
    finally:
        aspect_file.close()
    return aspect_pair, entity_level


def read_opinion_file(file_path):
    opinion_file = open(file_path, encoding='utf8')
    try:
        all_lines = opinion_file.readlines()
        opinion_pair = []
        polarity = 2
        for line in all_lines:
            pair = line.split()
            polarity = polarity % 3 - 1
            if len(pair) < 2:
                continue
            aspect = pair[0]
            for opinion in pair[1:len(pair)]:
                opinion_pair.append([aspect, opinion, polarity])
    finally:
        opinion_file.close()
    return opinion_pair


def single_analysis_function(input_text):
    pair = [['汽车', '性能', '不错', 1], ['汽车', '价格', '能接受', 0], ['汽车', '外观', '大气', 1], ['内饰', '空间', '不是很大', -1]]
    return pair


def multi_analysis_function(multi_review_path):
    pair = [['汽车', '整体', 550, 306, 954], ['汽车', '造型', 156, 534, 962], ['汽车', '性能', 664, 875, 277],
            ['汽车', '空间', 761, 335, 699], ['汽车', '性价比', 801, 1, 200], ['汽车', '油耗', 611, 119, 284],
            ['汽车', '外观', 531, 533, 267], ['汽车', '动力', 313, 233, 314], ['汽车', '隔音', 322, 634, 385],
            ['汽车', '价格', 338, 773, 741], ['汽车', '配置', 984, 474, 948], ['汽车', '舒适性', 886, 680, 724],
            ['汽车', '质量', 82, 561, 747], ['汽车', '起步', 863, 986, 68], ['汽车', '款式', 130, 553, 241],
            ['汽车', '噪音', 811, 923, 916], ['汽车', '销量', 262, 950, 285], ['汽车', '功能', 297, 617, 829],
            ['汽车', '安全性', 392, 20, 461], ['汽车', '气味', 172, 732, 235], ['汽车', '品牌', 49, 356, 701],
            ['汽车', '设计', 616, 834, 224], ['汽车', '尺寸', 221, 498, 811], ['汽车', '材料', 803, 843, 275],
            ['汽车', '操控', 395, 961, 590], ['汽车', '表现', 280, 312, 527], ['汽车', '成本', 616, 159, 684],
            ['汽车', '档次', 654, 621, 716], ['汽车', '问题', 750, 206, 821], ['汽车', '速度', 531, 413, 794],
            ['汽车', '线条', 214, 242, 140], ['汽车', '声音', 678, 809, 209], ['汽车', '口碑', 551, 103, 485],
            ['汽车', '风格', 452, 415, 826], ['汽车', '重心', 117, 153, 676], ['汽车', '颜色', 507, 698, 744],
            ['汽车', '长度', 543, 367, 212], ['汽车', '宽度', 557, 658, 15], ['汽车', '重量', 136, 295, 848],
            ['汽车', '轴距', 629, 588, 145], ['汽车', '排量', 977, 737, 292], ['汽车', '转速', 140, 980, 685],
            ['汽车', '型号', 721, 550, 262], ['汽车', '视野', 523, 31, 399], ['汽车', '优点', 222, 419, 635],
            ['汽车', '缺点', 956, 860, 929], ['车头', '整体', 566, 931, 75], ['车头', '造型', 391, 91, 402],
            ['车头', '设计', 484, 495, 412], ['车头', '线条', 960, 322, 580], ['车头', '外观', 640, 416, 292],
            ['车头', '位置', 550, 676, 438], ['车身', '整体', 993, 373, 55], ['车身', '造型', 881, 927, 24],
            ['车身', '线条', 310, 206, 943], ['车身', '尺寸', 376, 887, 301], ['车身', '重量', 359, 981, 228],
            ['车身', '长度', 221, 973, 916], ['车身', '宽度', 161, 872, 583], ['车身', '高度', 855, 388, 385],
            ['车身', '质量', 686, 316, 449], ['车身', '外观', 23, 496, 604], ['车身', '颜色', 238, 767, 525],
            ['车身', '设计', 295, 839, 327], ['车身', '比例', 516, 258, 146], ['车身', '结构', 255, 676, 95],
            ['车身', '稳定性', 548, 958, 759], ['车尾', '整体', 585, 691, 913], ['车尾', '造型', 786, 178, 183],
            ['车门', '整体', 85, 842, 843], ['车门', '隔音', 959, 585, 683], ['车窗', '整体', 592, 897, 889],
            ['车轮', '整体', 628, 844, 195], ['车灯', '整体', 537, 535, 351], ['车灯', '造型', 963, 76, 481],
            ['车灯', '设计', 809, 472, 153], ['车灯', '亮度', 155, 436, 497], ['车灯', '外观', 92, 845, 717],
            ['车灯', '效果', 233, 998, 368], ['底盘', '整体', 252, 353, 404], ['底盘', '高度', 209, 146, 842],
            ['底盘', '质感', 752, 662, 645], ['底盘', '用料', 425, 544, 789], ['底盘', '设计', 808, 522, 830],
            ['底盘', '稳定性', 535, 829, 885], ['底盘', '隔音', 806, 477, 265], ['底盘', '减震', 318, 697, 251],
            ['发动机', '整体', 820, 83, 758], ['发动机', '声音', 884, 537, 950], ['发动机', '噪音', 188, 935, 212],
            ['发动机', '转速', 130, 992, 536], ['发动机', '启停', 583, 686, 340], ['发动机', '动力', 206, 417, 421],
            ['发动机', '技术', 752, 547, 876], ['发动机', '隔音', 632, 553, 775], ['发动机', '故障', 695, 587, 367],
            ['发动机', '排量', 330, 539, 43], ['发动机', '油耗', 84, 725, 580], ['发动机', '表现', 640, 642, 162],
            ['发动机', '功率', 775, 551, 185], ['发动机', '质量', 383, 548, 316], ['发动机', '温度', 621, 679, 555],
            ['发动机', '性能', 432, 403, 3], ['发动机', '马力', 36, 860, 371], ['发动机', '型号', 599, 785, 297],
            ['变速箱', '整体', 836, 685, 131], ['变速箱', '反应', 773, 713, 256], ['变速箱', '表现', 440, 821, 371],
            ['变速箱', '故障', 226, 567, 259], ['变速箱', '技术', 55, 760, 365], ['变速箱', '手感', 411, 209, 845],
            ['变速箱', '感觉', 834, 384, 723], ['变速箱', '平顺性', 835, 735, 924], ['油门', '整体', 183, 976, 539],
            ['油门', '反应', 198, 474, 670], ['油门', '行程', 386, 819, 681], ['油门', '控制', 560, 328, 329],
            ['油门', '位置', 84, 335, 495], ['油门', '感觉', 378, 193, 545], ['油门', '力度', 1, 799, 176],
            ['油门', '声音', 590, 326, 867], ['油门', '灵敏度', 771, 515, 638], ['刹车', '整体', 59, 700, 143],
            ['刹车', '反应', 21, 765, 945], ['刹车', '性能', 658, 854, 514], ['刹车', '力度', 721, 679, 653],
            ['刹车', '行程', 454, 865, 502], ['刹车', '位置', 524, 25, 433], ['刹车', '效果', 226, 21, 977],
            ['刹车', '问题', 717, 112, 575], ['刹车', '故障', 154, 547, 677], ['刹车', '声音', 900, 763, 697],
            ['刹车', '灵敏度', 699, 690, 144], ['离合器', '整体', 477, 525, 727], ['离合器', '行程', 435, 64, 817],
            ['离合器', '位置', 25, 899, 970], ['方向盘', '整体', 139, 939, 86], ['方向盘', '造型', 82, 605, 295],
            ['方向盘', '手感', 469, 107, 138], ['方向盘', '力度', 442, 652, 862], ['方向盘', '轻重', 752, 805, 774],
            ['方向盘', '尺寸', 812, 689, 933], ['方向盘', '设计', 252, 404, 139], ['方向盘', '操作', 295, 601, 307],
            ['方向盘', '材料', 783, 34, 645], ['方向盘', '控制', 365, 333, 691], ['方向盘', '功能', 101, 151, 819],
            ['仪表盘', '整体', 490, 149, 352], ['仪表盘', '设计', 397, 93, 309], ['仪表盘', '造型', 780, 51, 868],
            ['仪表盘', '背景', 693, 755, 683], ['仪表盘', '功能', 632, 426, 714], ['仪表盘', '亮度', 721, 507, 843],
            ['座椅', '整体', 422, 570, 4], ['座椅', '包裹', 881, 831, 942], ['座椅', '硬度', 683, 949, 705],
            ['座椅', '厚度', 323, 811, 414], ['座椅', '角度', 382, 650, 200], ['座椅', '宽度', 798, 661, 525],
            ['座椅', '设计', 41, 693, 635], ['座椅', '材料', 185, 908, 386], ['座椅', '感觉', 443, 766, 279],
            ['座椅', '手感', 216, 338, 328], ['座椅', '支撑', 831, 694, 171], ['座椅', '布局', 538, 518, 502],
            ['座椅', '位置', 379, 847, 921], ['座椅', '颜色', 606, 815, 520], ['座椅', '质量', 646, 819, 335],
            ['座椅', '舒适性', 880, 622, 335], ['空调', '整体', 867, 697, 966], ['空调', '效果', 965, 789, 720],
            ['空调', '动力', 747, 990, 860], ['空调', '油耗', 8, 350, 851], ['空调', '操作', 601, 806, 366],
            ['空调', '温度', 167, 985, 458], ['空调', '声音', 865, 877, 528], ['空调', '噪音', 5, 700, 690],
            ['空调', '感觉', 382, 893, 982], ['空调', '功能', 378, 860, 486], ['空调', '性能', 223, 880, 848],
            ['雷达', '整体', 867, 696, 628], ['雷达', '声音', 979, 765, 464], ['音响', '整体', 981, 33, 312],
            ['音响', '效果', 183, 158, 999], ['音响', '音质', 724, 214, 622], ['音响', '声音', 385, 934, 807],
            ['音响', '质量', 395, 905, 681], ['音响', '感觉', 121, 448, 391], ['音响', '音量', 528, 609, 877],
            ['内饰', '整体', 847, 825, 898], ['内饰', '材料', 295, 899, 676], ['内饰', '设计', 596, 541, 489],
            ['内饰', '风格', 578, 608, 532], ['内饰', '颜色', 295, 481, 454], ['内饰', '配置', 851, 597, 706],
            ['内饰', '质感', 751, 464, 602], ['内饰', '布局', 316, 508, 750], ['内饰', '造型', 248, 244, 131],
            ['内饰', '味道', 913, 707, 755], ['内饰', '档次', 546, 725, 354],
            ['内饰', '手感', 384, 139, 357], ['内饰', '外观', 375, 334, 35], ['内饰', '气味', 11, 249, 263],
            ['导航', '整体', 461, 26, 545], ['导航', '功能', 274, 465, 509], ['导航', '版本', 445, 356, 518],
            ['导航', '反应', 449, 518, 706], ['导航', '声音', 760, 471, 762], ['喇叭', '整体', 915, 518, 537],
            ['喇叭', '声音', 32, 939, 746], ['喇叭', '音质', 975, 170, 634], ['喇叭', '效果', 586, 40, 320],
            ['喇叭', '音量', 688, 353, 869], ['后备箱', '整体', 160, 260, 853], ['后备箱', '空间', 57, 27, 217],
            ['后备箱', '容量', 84, 314, 206], ['后备箱', '设计', 878, 81, 593], ['后备箱', '尺寸', 988, 399, 836],
            ['后备箱', '隔音', 869, 428, 406], ['后备箱', '长度', 6, 241, 138], ['后备箱', '深度', 353, 377, 370],
            ['后备箱', '宽度', 864, 96, 845], ['气囊', '整体', 363, 35, 566], ['气囊', '故障', 56, 55, 945],
            ['天窗', '整体', 72, 654, 348], ['天窗', '视野', 766, 660, 547], ['天窗', '面积', 663, 80, 184],
            ['天窗', '设计', 484, 797, 242], ['引擎盖', '整体', 219, 717, 487], ['引擎盖', '隔音', 463, 714, 529],
            ['引擎盖', '缝隙', 743, 117, 330], ['铰链', '整体', 902, 596, 493], ['储物格', '整体', 735, 688, 243],
            ['储物格', '设计', 854, 754, 194], ['储物格', '空间', 696, 425, 133], ['车门开关', '整体', 264, 948, 688],
            ['车门开关', '', 883, 525, 365], ['车门开关', '位置', 137, 598, 710], ['玻璃', '整体', 485, 482, 890],
            ['玻璃', '隔音', 630, 621, 140], ['玻璃', '面积', 104, 638, 771], ['车窗开关', '整体', 732, 745, 205],
            ['车窗开关', '', 54, 215, 682], ['车窗开关', '位置', 512, 585, 241], ['车窗按钮', '整体', 991, 819, 991],
            ['升降机', '整体', 296, 496, 735], ['轮胎', '整体', 3, 185, 451], ['轮胎', '噪音', 403, 421, 483],
            ['轮胎', '规格', 530, 59, 552], ['轮胎', '气压', 608, 274, 378], ['轮胎', '尺寸', 643, 324, 406],
            ['轮胎', '声音', 511, 170, 573], ['轮胎', '宽度', 977, 746, 876], ['轮胎', '问题', 720, 131, 284],
            ['轮胎', '花纹', 319, 494, 397], ['轮胎', '温度', 698, 284, 114], ['轮胎', '性能', 791, 273, 863],
            ['轮胎', '型号', 387, 707, 566], ['轮毂', '整体', 156, 808, 498], ['轮毂', '造型', 208, 539, 51],
            ['轮毂', '样式', 921, 185, 198], ['轮毂', '尺寸', 573, 105, 569], ['大灯', '整体', 131, 437, 522],
            ['大灯', '亮度', 968, 180, 898], ['大灯', '设计', 492, 724, 698], ['大灯', '造型', 695, 155, 284],
            ['大灯', '配置', 385, 532, 441], ['大灯', '接缝', 986, 435, 673], ['大灯', '外观', 519, 932, 607],
            ['大灯', '高度', 182, 404, 532], ['大灯', '位置', 43, 851, 880], ['大灯', '功能', 790, 652, 504],
            ['尾灯', '整体', 677, 359, 674], ['尾灯', '设计', 980, 865, 956], ['尾灯', '造型', 579, 761, 789],
            ['尾灯', '辨识度', 747, 829, 922], ['雾灯', '整体', 445, 940, 139], ['刹车灯', '整体', 784, 122, 890],
            ['皮带', '整体', 779, 445, 270], ['隔音板', '整体', 729, 155, 106], ['齿轮', '整体', 56, 659, 381],
            ['油门踏板', '整体', 982, 754, 794], ['油门踏板', '行程', 788, 403, 173], ['油门踏板', '位置', 677, 367, 601],
            ['刹车踏板', '整体', 597, 343, 942], ['刹车踏板', '行程', 622, 308, 152], ['刹车踏板', '位置', 470, 693, 620],
            ['离合器踏板', '整体', 403, 253, 422], ['离合器踏板', '行程', 472, 154, 968], ['离合器踏板', '位置', 138, 99, 534],
            ['椅面', '整体', 408, 806, 944], ['椅背', '整体', 289, 509, 938], ['椅背', '角度', 4, 253, 751],
            ['座垫', '整体', 82, 62, 942], ['安全带', '整体', 310, 589, 783], ['皮套', '整体', 468, 400, 510],
            ['滤芯', '整体', 501, 555, 66], ['压缩机', '整体', 681, 636, 508], ['压缩机', '噪音', 359, 296, 59],
            ['空调旋钮', '整体', 607, 184, 490], ['空调旋钮', '手感', 402, 551, 336], ['空调旋钮', '位置', 786, 265, 256],
            ['空调旋钮', '设计', 186, 555, 504], ['空调按钮', '整体', 523, 244, 992], ['空调开关', '整体', 313, 828, 360],
            ['空调开关', '位置', 510, 581, 783], ['排水孔', '整体', 607, 848, 127], ['遮阳帘', '整体', 585, 40, 659]]
    return pair


def multi_analysis_result(entity_pair):
    global ent_attr_polar, ent_attr_text, ent_polar
    ent_polar = dict()
    ent_text = dict()
    ent_attribute = dict()
    for ent_attr, polar in ent_attr_polar.items():
        ent = ent_attr.split('-')[0]
        attr = ent_attr.split('-')[1]
        attrs = ent_attribute.setdefault(ent, [])
        if attr not in attrs:
            attrs.append(attr)
            ent_attribute[ent] = attrs
        polars = ent_polar.setdefault(ent, [0, 0, 0])
        polars = (np.array(polars) + np.array(polar)).tolist()
        ent_polar[ent] = polars
    for ent, _ in ent_polar.items():
        txts = ent_text.setdefault(ent, [[], [], []])
        general_txt = ent_attr_text.setdefault(ent + '-' + '整体', [[], [], []])
        for i in range(3):
            txts[i] = txts[i] + general_txt[i]
            if not txts[i]:
                for attr in ent_attribute[ent]:
                    txt = ent_attr_text[ent + '-' + attr][i]
                    if txt:
                        txts[i] = txts[i] + txt
                        break
        ent_text[ent] = txts
    root = {'name': '汽车', 'id': 1, 'pos': ent_polar['汽车'][0], 'neu': ent_polar['汽车'][1], 'neg': ent_polar['汽车'][2],
            'pos_sentence': ' || '.join(ent_text['汽车'][0]), 'neu_sentence': ' || '.join(ent_text['汽车'][1]),
            'neg_sentence': ' || '.join(ent_text['汽车'][2]), 'child': [], 'type': 'entity'}
    id = 1
    _ = build_tree(entity_pair, root, ent_text, id)
    return root


def build_tree(entity_pair, node, ent_text, id):
    global ent_polar
    for parent, child, level in entity_pair:
        if parent == node['name']:
            id = id + 1
            ent_polar.setdefault(child, [0, 0, 0])
            ent_text.setdefault(child, [[], [], []])
            new_node = {'name': child, 'id': id, 'pos': ent_polar[child][0], 'neu': ent_polar[child][1],
                        'neg': ent_polar[child][2],
                        'pos_sentence': ' || '.join(ent_text[child][0]),
                        'neu_sentence': ' || '.join(ent_text[child][1]),
                        'neg_sentence': ' || '.join(ent_text[child][2]), 'child': [], 'type': 'entity'}
            node['child'].append(new_node)
            id = build_tree(entity_pair, new_node, ent_text, id)
    return id


def entity_profile_dict(multi_review_result):
    pair = []
    dict = {}
    for p in multi_review_result:
        if not dict.__contains__(p[0]):
            dict[p[0]] = [0, 0, 0]
        dict[p[0]] = list(map(lambda x: x[0] + x[1], zip(dict[p[0]], p[2:])))
    for key in dict:
        pair.append([key] + dict[key])
    return pair


def single_analysis_results(single_result_pair, entity_pair, entity_level):
    results = []
    entity_included = []
    for pair in single_result_pair:
        entity_included.append(pair[0])
    flag_included_all = False
    while flag_included_all is False:
        flag_included_all = True
        for pair in entity_pair:
            if pair[1] in entity_included and pair[0] not in entity_included:
                entity_included.append(pair[0])
                flag_included_all = False
    for pair in entity_pair:
        if pair[1] in entity_included:
            results.append([pair[0], pair[1], '', -2, pair[2], ''])
    for pair in single_result_pair:
        ent = pair[0]
        attr = pair[1]
        describe = pair[2]
        polarity = pair[3]
        if polarity is None:
            polarity = 0
        sentence = pair[4]
        level = entity_level[ent]
        results.append([ent, attr, describe, polarity, level, sentence])
    return results


@app.route('/home', methods=['GET', 'POST'])
def homepage():
    # form = SentimentForm()
    form = TrainingForm()
    input_text = None
    result_list = None
    filename = None
    upload_error = None
    download_filepath = None
    table = None
    entity_pair = None
    entity_attr = None
    entity_synonym = None
    attr_synonym = None
    input_text1 = None
    opinion_pair = None
    single_results = None
    entity_level = None
    entity_profile = None
    show_aspect_graph = False
    multi_analysis = None
    global profile_tree
    entity_pair, entity_level = read_aspect_file('./KnowledgeBase/whole-part.txt')
    entity_attr, _ = read_aspect_file('./KnowledgeBase/entity-attribute.txt', entity_level)
    entity_synonym, _ = read_aspect_file('./KnowledgeBase/entity-synonym.txt', entity_level)
    attr_synonym, _ = read_aspect_file('./KnowledgeBase/attribute-synonym.txt')
    opinion_pair = read_opinion_file('./KnowledgeBase/attribute-description.txt')
    if form.is_submitted():
        if form.submit_text.data:
            input_text = form.text.data
            sentiments, single_pairs = analysis_comment(text=input_text, debug=True, use_nn=use_nn, **init_data)
            # result_list = [sentiments]
            single_pairs = list(set([tuple(t) for t in single_pairs]))
            for ent, attr, describ, polar, text in single_pairs:
                print(ent + ' ' + attr + ' ' + describ + ' ' + str(polar) + ' ' + text)
            show_aspect_graph = False
            input_text = form.text.data
            single_results = single_analysis_results(single_pairs, entity_pair, entity_level)
        elif form.submit_file.data:
            try:
                filename = texts.save(form.file.data)
                file_url = texts.url(filename)
                print(file_url)
                global ent_attr_polar, ent_attr_text
                gl.set_value('STATE', 'busy')
                ent_attr_polar, ent_attr_text, download_filepath = gen_summary(filename=filename, use_nn=use_nn,
                                                                               init_data=init_data)
                profile_tree = multi_analysis_result(entity_pair)
                download_filepath = 'downloads/' + download_filepath
                gl.set_value('UPLOAD_FILE_PATH', filename)
                file = open('static/result_json/' + filename + '.js', 'wb')
                file.write(('var data=new Array();\ndata[\'全部\']=\'' + json.dumps(profile_tree) + '\';').replace('\\"',
                                                                                                                 '\\\\"').encode(
                    'utf-8'))
                file.close()
                # menu(profile_tree)
                # return send_from_directory('static', 'downloads/' + download_filepath)
            except UploadNotAllowed as una:
                upload_error = 'error!'
                print(una)
        # if form.submit_text.data:
        #     show_aspect_graph = True
        #     input_text = form.text.data
        #     single_pairs = single_analysis_function(input_text)
        #     single_results = single_analysis_results(single_pairs, entity_pair, entity_level)
        #     # _, sentiments, _, _, _ = analysis_comment(input_text, debug=True, file=re_file, use_nn=use_nn, **init_data)
        #     # result_list = [sentiments]
        elif form.submit_file.data:
            show_aspect_graph = False
            file = request.files['file']
            filename = secure_filename(file.filename)
            file.save(UPLOAD_FOLDER + '/' + filename)
            multi_analysis = multi_analysis_function(UPLOAD_FOLDER + '/' + filename)
            entity_profile = entity_profile_dict(multi_analysis)
            try:
                filename = texts.save(form.file.data)
                file_url = texts.url(filename)
                print(file_url)
                table, download_filepath = gen_summary(filename=filename, use_nn=use_nn, init_data=init_data)
                download_filepath = 'downloads/' + download_filepath
                # return send_from_directory('static', 'downloads/' + download_filepath)
            except UploadNotAllowed as una:
                upload_error = '666'
                print(una)
        else:
            show_aspect_graph = True


            # if form.submit_file_opinion_pair.data:
            #     if entity_pair is None:
            #         entity_pair, entity_level = read_aspect_file(UPLOAD_FOLDER + '/' + 'entity_default.txt')
            #         entity_attr, _ = read_aspect_file(UPLOAD_FOLDER + '/' + 'entity_attr_default.txt')
            #         entity_synonym, _ = read_aspect_file(UPLOAD_FOLDER + '/' + 'entity_synonym_default.txt')
            #         attr_synonym, _ = read_aspect_file(UPLOAD_FOLDER + '/' + 'attr_synonym_default.txt')
            # file=request.files['file_opinion_pair']
            # filename = secure_filename(file.filename)
            # file.save(UPLOAD_FOLDER+'/'+filename)
            # opinion_pair,_=read_aspect_file(UPLOAD_FOLDER+'/'+filename)
            # if form.submit_file_aspect.data:
            #     try:
            #         uploaded_files = request.files.getlist("file_aspect")
            #         filenames = []
            #         for file in uploaded_files:
            #             filename = secure_filename(file.filename)
            #             file.save(UPLOAD_FOLDER+'/'+filename)
            #             filenames.append(filename)
            #         if len(filenames)!=4:
            #             raise UploadNotAllowed
            #         entity_pair, entity_level = read_aspect_file(UPLOAD_FOLDER + '/' + filenames[3])
            #         entity_attr, _ = read_aspect_file(UPLOAD_FOLDER + '/' + filenames[2])
            #         entity_synonym, _ = read_aspect_file(UPLOAD_FOLDER + '/' + filenames[1])
            #         attr_synonym, _ = read_aspect_file(UPLOAD_FOLDER + '/' + filenames[0])
            #     except UploadNotAllowed :
            #             print('上传文件有误！')
    return render_template('testForm.html', form=form,
                           input_text=input_text,
                           input_text1=input_text1,
                           result_list=result_list,
                           filename=filename,
                           upload_error=upload_error,
                           download_filepath=download_filepath,
                           table=table,
                           entity_pair=entity_pair,
                           entity_attr=entity_attr,
                           entity_synonym=entity_synonym,
                           attr_synonym=attr_synonym,
                           opinion_pair=opinion_pair,
                           single_results=single_results,
                           show_aspect_graph=show_aspect_graph,
                           entity_profile=entity_profile,
                           multi_analysis=multi_analysis,
                           profile_tree=profile_tree)


if __name__ == '__main__':
    print('Server is running')
    # app.run(host='0.0.0.0', debug=True, threaded=True)  # debug=True
    app.run(host='0.0.0.0', debug=False, port=5001, threaded=True)  # debug=True
