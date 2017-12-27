"""
网站Demo API模块
"""

import os

from flask import Flask, request,redirect, url_for
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
# from utils.misc_utils import get_args_info

basedir = os.path.abspath(os.path.dirname(__file__))


app = Flask(__name__)
bootstrap = Bootstrap(app)
app.config['SECRET_KEY'] = 'AIMindreader'
app.config['UPLOADED_TEXTS_DEST'] = './uploads'
UPLOAD_FOLDER = './uploads'
ALLOWED_EXTENSIONS = set(['txt'])

texts = UploadSet('texts', TEXT)
configure_uploads(app, texts)
patch_request_class(app)  # 文件大小限制，默认为16MB


use_nn = False
init_data = init(use_nn=use_nn)


# class SentimentForm(FlaskForm):
#     text = TextAreaField('请输入待分析的文本：')
#     submit_text = SubmitField('提交')
#
#     file = FileField('请上传待分析的文件：')
#     submit_file = SubmitField('提交')

@app.route('/', methods=['GET', 'POST'])
def home():
    return render_template('home.html')


class TrainingForm(FlaskForm):
    text = TextAreaField('请输入待分析的文本：')
    submit_text = SubmitField('提交')

    # text1 = TextAreaField('请输入训练用评论语料库：')
    # submit_text1 = SubmitField('提交')

    file = FileField('请上传待分析语料库文件：')
    submit_file = SubmitField('提交')

    aspect = FileField('aspect')
    submit_aspect=SubmitField('显示产品构成')

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

@app.route('/test',methods=['GET','POST'])
def test_home():
    aspect_pair=[['phone','screen'],['phone','camera'],['phone','battery'],['screen','size'],['screen','resolution'],['camera','picture quality'],['battery','life']];
    for source,target in aspect_pair:
        print(source+'--'+target+'\n')
    return render_template('test.html',aspect_pair=aspect_pair)


def read_aspect_file(file_path,entity_level=None):
    flag = False
    if entity_level is None:
        flag=True
    if flag:
        entity_level=dict()
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
                entity_level[parent]=1
            for child in aspects[1:len(aspects)]:
                aspect_pair.append([parent, child, entity_level[parent]])
                if flag and (child not in entity_level):
                    entity_level[child]=entity_level[parent]+1
    finally:
        aspect_file.close()
    return aspect_pair,entity_level


def read_opinion_file(file_path):
    opinion_file = open(file_path, encoding='utf8')
    try:
        all_lines = opinion_file.readlines()
        opinion_pair = []
        polarity = 1
        for line in all_lines:
            pair = line.split()
            polarity=polarity%3-1
            if len(pair) < 2:
                continue
            aspect = pair[0]
            for opinion in pair[1:len(pair)]:
                opinion_pair.append([aspect, opinion, polarity])
    finally:
        opinion_file.close()
    return opinion_pair


def single_analysis_function(input_text):
    pair=[['汽车','性能','不错',1],['汽车','价格','能接受',0],['汽车','外观','大气',1],['内饰','空间','不是很大',-1]]
    return pair


def single_analysis_results(single_result_pair,entity_pair,entity_level):
    results=[]
    entity_included=[]
    for pair in single_result_pair:
        entity_included.append(pair[0])
    for pair in entity_pair:
        if pair[1] in entity_included:
            results.append([pair[0],pair[1],'',-2,pair[2]])
    for pair in single_result_pair:
        ent=pair[0]
        attr=pair[1]
        describe=pair[2]
        polarity=pair[3]
        level=entity_level[ent]
        results.append([ent,attr,describe,polarity,level])
    return results


@app.route('/api/AIMindreader', methods=['GET', 'POST'])
def ai_mindreader_home():
    # form = SentimentForm()
    form = TrainingForm()
    input_text = None
    result_list = None
    filename = None
    upload_error = None
    download_filepath = None
    table = None
    entity_pair=None
    entity_attr=None
    entity_synonym=None
    attr_synonym=None
    input_text1=None
    opinion_pair=None
    single_results=None
    entity_level=None
    show_aspect_graph=False
    entity_pair, entity_level = read_aspect_file(UPLOAD_FOLDER + '/' + 'entity_default.txt')
    entity_attr, _ = read_aspect_file(UPLOAD_FOLDER + '/' + 'entity_attr_default.txt', entity_level)
    entity_synonym, _ = read_aspect_file(UPLOAD_FOLDER + '/' + 'entity_synonym_default.txt', entity_level)
    attr_synonym, _ = read_aspect_file(UPLOAD_FOLDER + '/' + 'attr_synonym_default.txt')
    opinion_pair = read_opinion_file(UPLOAD_FOLDER + '/' + 'attr_describe_default.txt')
    if form.is_submitted():
        if form.submit_text.data:
            show_aspect_graph=False
            input_text = form.text.data
            single_pairs=single_analysis_function(input_text)
            single_results=single_analysis_results(single_pairs,entity_pair,entity_level)
            # _, sentiments, _, _, _ = analysis_comment(input_text, debug=True, file=re_file, use_nn=use_nn, **init_data)
            # result_list = [sentiments]
        elif form.submit_file.data:
            show_aspect_graph=False
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
            show_aspect_graph=True


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
                               show_aspect_graph=show_aspect_graph)
    # return render_template('sentimentForm.html', form=form,
    #                        input_text=input_text,
    #                        result_list=result_list,
    #                        filename=filename,
    #                        upload_error=upload_error,
    #                        download_filepath=download_filepath,
    #                        table=table)


if __name__ == '__main__':
    print('Server is running')
    app.run(host='0.0.0.0', debug=True, threaded=True)  # debug=True




