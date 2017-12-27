import os
os.environ['KERAS_BACKEND'] = 'theano'  # 换成TensorFlow backend的话，加载nn模型总报错，甚是诡异……
import sys
import re
import copy
import numpy as np
from itertools import chain
from collections import Counter
from more_itertools import unique_everseen
from keras.preprocessing.sequence import pad_sequences
from keras.models import load_model
from pyltp import Segmentor, Postagger, Parser
try:
    import cPickle as pickle
except ImportError:
    import pickle

_LTP_DATA_DIR = r'K:\program\Python36-32\Scripts\pyltp\ltp_data' if sys.platform == 'win32' else os.path.expanduser('~/program/Python36-32/Scripts/pyltp/ltp_data')
#_LTP_DATA_DIR = r'd:\datasets\ltp_data' if sys.platform == 'win32' else os.path.expanduser('~/datasets/ltp_data')
_DEFAULT_ENTITY = 'DEFAULT_ENTITY'  # 用于加载sentiment lexicon，通用情感词的默认搭配填充
# ltp对象，用于分词、POS、Parser
_segmentor = Segmentor()
_postagger = Postagger()
_parser = Parser()
# 根据EntityLink的返回结果，涉及到下列概念的entity不要
STOP_CONCEPTS = {'字词', '语言', '音乐作品', '娱乐作品', '词语'}
# 否定词前缀
NEGATION_WORDS = {'不', '无', '没', '没有', '不是', '不大', '不太'}
# 语气前缀词
PREFIX_STOPWORDS = {'感觉', '觉得', '还', '就是', '还是', '真心'}
# 语气后缀词
SUFFIX_STOPWORDS = {'了', '哈', '喔', '啊', '哈', '撒', '吧', '啦', '拉', '阿', '的', '嗷'}
# 情感强度前缀词
INTENSITY_PREFIX_WORDS = {'好', '很', '都', '真', '太', '大', '超', '挺', '还', '还挺', '特', '特别', '非常', '灰常', '都很', '相当'}
# 情感强度后缀词
INTENSITY_SUFFIX_WORDS = {'至极', '极', '透'}
# Entity黑名单，情感分析模块使用
ENTITY_BLACKLIST = set(line.strip() for line in open('libs/entity_blacklist.txt', 'r', encoding='utf8'))
# Entity白名单，情感分析模块使用
ENTITY_WHITELIST = set(line.strip().split()[0] for line in open('libs/entity_whitelist.txt', 'r', encoding='utf8'))
if len(ENTITY_BLACKLIST & ENTITY_WHITELIST) > 0:
    print('conflict in entitylist:', file=sys.stderr)
    print(ENTITY_BLACKLIST & ENTITY_WHITELIST, file=sys.stderr)


def ltp_init():
    """初始化LTP工具"""
    cws_model_path = os.path.join(_LTP_DATA_DIR, 'cws.model')
    _segmentor.load_with_lexicon(cws_model_path, 'libs/user_dict.txt')
    pos_model_path = os.path.join(_LTP_DATA_DIR, 'pos.model')
    _postagger.load(pos_model_path)
    par_model_path = os.path.join(_LTP_DATA_DIR, 'parser.model')
    _parser.load(par_model_path)


def ltp_release():
    _segmentor.release()
    _postagger.release()
    _parser.release()


def load_sentiment_lexicon(path='libs/sentiment_lexicon.txt'):
    """加载情感词典文件"""
    lexicon = dict()
    with open(path, 'r', encoding='utf-8', errors='ignore') as fr:
        for line in fr:
            fields = line.strip().lower().split()
            if len(fields) >= 2:
                word, score, *aspects = fields
                score = int(score)
                if len(aspects) == 0:
                    # 单独的情感词（非形如“价格-高”二元搭配），用_DEFAULT_ENTITY作为默认entity搭配
                    lexicon.setdefault(word, dict()).setdefault(_DEFAULT_ENTITY, score)
                    lexicon.setdefault('不' + word, dict()).setdefault(_DEFAULT_ENTITY, -score)
                    for prefix in INTENSITY_PREFIX_WORDS:
                        lexicon.setdefault(prefix + word, dict()).setdefault(_DEFAULT_ENTITY, score)
                else:
                    for aspect in aspects:
                        ENTITY_WHITELIST.add(aspect)
                        lexicon.setdefault(word, dict()).setdefault(aspect, score)
                        lexicon.setdefault('不' + word, dict()).setdefault(aspect, -score)
                        for prefix in INTENSITY_PREFIX_WORDS:
                            lexicon.setdefault(prefix + word, dict()).setdefault(aspect, score)
    return lexicon


def load_aspects(path='libs/aspects.txt'):
    """加载预定义的aspect分类设置

    aspect.txt文件格式：
        - [xx]代表一级类别
        - 其余每行代表一个附属的二级类别，每行第一个词语是二级类别的名称，后面的所有词语代表这个类别的关键词（用于类别匹配）
    """
    term2aspect = dict()
    lv1_aspects = set()
    lv2_aspects = set()
    with open(path, 'r', encoding='utf8') as fr:
        for line in fr:
            line = line.strip().lower()
            if len(line) > 0:
                if line.startswith('['):  # lv1 aspect
                    lv1_aspect = line.replace('[', '').replace(']', '')
                    lv1_aspects.add(lv1_aspect)
                    term2aspect[lv1_aspect] = lv1_aspect
                    ENTITY_WHITELIST.add(lv1_aspect)
                else:
                    terms = line.split()
                    lv2_aspect = terms[0]
                    if lv2_aspect == '整体描述':
                        for term in terms[1:]:
                            term2aspect[term] = lv1_aspect
                            ENTITY_WHITELIST.add(term)
                    else:
                        lv2_aspects.add(lv2_aspect)
                        for term in terms:
                            term2aspect[term] = lv1_aspect + '-' + lv2_aspect
                            ENTITY_WHITELIST.add(term)
    # print('aspects loaded:')
    # print(' - terms:', len(term2aspect))
    # print(' - lv1 aspects:', len(lv1_aspects))
    # print(' - lv2 aspects:', len(lv2_aspects))
    return term2aspect, lv1_aspects, lv2_aspects


def load_va2aspect(path='libs/va2aspect.txt'):
    """加载va2aspect文件
    该文件涵义：检测到特定的描述，如“高性价比”，则将其映射到“价格”，并为正面。
    这部分词语主要是形容词、动词，而aspects.txt里的关键词主要是名词、实体类词语。
    """
    va2aspect = dict()
    with open(path, 'r', encoding='utf8') as fr:
        for line in fr:
            terms = line.strip().lower().split()
            if len(terms) >= 3:
                va2aspect[terms[0]] = (terms[1], int(terms[2]))
                for word in NEGATION_WORDS:
                    va2aspect[word + terms[0]] = (terms[1], -int(terms[2]))
                for word in INTENSITY_PREFIX_WORDS:
                    va2aspect[word + terms[0]] = (terms[1], int(terms[2]))
                for word in INTENSITY_SUFFIX_WORDS:
                    va2aspect[terms[0] + word] = (terms[1], int(terms[2]))
                ENTITY_WHITELIST.add(terms[0])
    # print('va2aspect loaded:')
    # print(' - v/a:', len(va2aspect))
    return va2aspect


def load_vamatch(path='libs/va_match.txt'):
    """加载va_match文件
    该文件涵义：整句如果匹配上这些预定义的语句，则直接分类。
    这部分的表述通常过于简单，无法捕捉到明显的aspect，但如果放在va2aspect里又因为很容易部分匹配导致误判，因此直接整句匹配（实际上前后补充了一些语气的前缀、后缀词）
    """
    va_match = dict()
    with open(path, 'r', encoding='utf8') as fr:
        for line in fr:
            terms = line.strip().lower().split()
            if len(terms) >= 3:
                va_match[terms[0]] = (terms[1], int(terms[2]))
                for word in NEGATION_WORDS:
                    va_match[word + terms[0]] = (terms[1], -int(terms[2]))
                for word in INTENSITY_PREFIX_WORDS:
                    va_match[word + terms[0]] = (terms[1], int(terms[2]))
                for word in INTENSITY_SUFFIX_WORDS:
                    va_match[terms[0] + word] = (terms[1], int(terms[2]))
    # print('va_match loaded:')
    # print(' - v/a:', len(va_match))
    return va_match


def clean_text(text):
    text = text.lower()
    text = text.replace(r'\n', ' ')
    text = text.replace(r'&hellip;', ' ')
    text = re.sub(r'\.{2,}', '，', text)  # many dots to comma
    text = re.sub(r'[1-9一二三四五六七八九]、', ' ', text)
    text = re.sub(r' +', r' ', text)  # many spaces to one
    text = re.sub(r'不(是很|太)', r'不', text)
    text = re.sub(r'没(有)?想象(中)?(的)?', r'不', text)
    # 去掉语句中的语气前缀词语，如“非常非常非常非常好看” -> “好看”
    for word in set(PREFIX_STOPWORDS):
        if text.startswith(word):
            while text.startswith(word) and len(text) > len(word):
                text = text.replace(word, '', 1)
    # 去掉语句中的语气后缀词语
    for word in set(SUFFIX_STOPWORDS):
        if text.endswith(word):
            while text.endswith(word) and len(text) > len(word):
                text = text[::-1].replace(word[::-1], '', 1)[::-1]
    text = _domain_specific_clean(text)
    return text


def _domain_specific_clean(text):
    """领域特定的文本预处理比如众多不同表述形式的Surface，统一处理后可以提升匹配率"""
    text = re.sub(r'(new)?( )?(surface( )?(pro)?|sp)( )?[345]?( )?', r'surface', text)
    text = re.sub(r'surface( )?pen', r'surfacepen', text)
    text = re.sub(r'win(dows)?( )?10', r'windows10', text)
    return text


def split_sentences(text):
    """文本拆分为单句。后续分析时按照单句处理"""
    sents = re.split(r'[,，。！!？?~～：:；;…=\s\n]', text)
    sents = [sent.strip() for sent in sents if len(sent.strip()) > 0]
    return sents


UNIQUE = 'unique'  # grammar_analysis使用
sorted_unique_words = None


def grammar_analysis(_text, _entities, _lexicon):
    # entity&lexicon替换为id tag，避免分词时被分开
    id2word = dict()
    replace_logs = []
    global sorted_unique_words
    if not sorted_unique_words:
        sorted_unique_words = list(sorted(chain(_entities, _lexicon.keys()), key=len, reverse=True))
    for idx, word in enumerate(sorted_unique_words):
        if word in _text:
            id2word[UNIQUE + str(idx)] = word
            if word not in '-'.join(replace_logs):
                _text = _text.replace(word, ' ' + UNIQUE + str(idx) + ' ')  # 首尾加入空格，防止连续在一起出现的实体无法识别
                replace_logs.append(str(idx))
    words = list(_segmentor.segment(_text))
    # 将被替换的entity&lexicon词语恢复
    unique_indices = set()
    for idx, word in enumerate(words):
        if word in id2word:
            words[idx] = id2word[word]
            unique_indices.add(idx)
    # postags
    postags = list(_postagger.postag(words))
    # 对words/postags的结果进行修正
    for idx, (word, postag) in enumerate(zip(words, postags)):
        if idx < len(postags)-1:
            if word == '好' and postag == 'a' and postags[idx+1] == 'a':
                postags[idx] = 'd'
        if idx in unique_indices:
            if words[idx] in _entities:
                postags[idx] = 'n'
            if words[idx] in _lexicon:
                postags[idx] = 'v'
    # parser
    arcs = _parser.parse(words, postags)
    return words, postags, arcs


def sentiment_analysis(text, words, postags, arcs, lexicon,
                       debug=False, file=sys.stdout):
    """情感分析模块
    算法思路：根据Dependency Parser的结果，结合一系列预定义的语法规则，抽取情感搭配
    """
    words.append('HED')
    parcs = [(arc.relation, (arc.head - 1, words[arc.head - 1]), (idx, words[idx])) for idx, arc in enumerate(arcs)]
    if debug:
        print('text:', text, file=file)
        print('words:', words, file=file)
        print('tags :', postags, file=file)
        print('arcs :', file=file)
        for parc in parcs:
            print(' ', parc[0], parc[1], '->', parc[2], end='', file=file)
        print(file=file)

    dualistics = dict()  # 保存二元关系，即entity-sentiment pair（只保存index）
    entity2score = dict()
    this_entities = set()
    this_lexicon = set()
    for idx, word in enumerate(words[:-1]):
        if word in lexicon:
            this_lexicon.add(idx)

    def _is_entity(_parc, _idx):
        if _parc[_idx][1] in ENTITY_WHITELIST:
            return True
        if _parc[_idx][1] in ENTITY_BLACKLIST:
            return False
        if postags[_parc[_idx][0]].startswith('n') and (not postags[_parc[_idx][0]].startswith(('nt', 'nd'))):
            return True
        return False

    def _in_lexicon(senti, entity):
        if senti in lexicon:
            if lexicon[senti].keys() == {_DEFAULT_ENTITY} or entity == _DEFAULT_ENTITY:
                return True
            else:
                return entity in lexicon[senti].keys()
        else:
            return False

    def _get_score(senti, entity):
        if senti in lexicon:
            if lexicon[senti].keys() == {_DEFAULT_ENTITY} or entity == _DEFAULT_ENTITY:
                return lexicon[senti][_DEFAULT_ENTITY]
            if entity in lexicon[senti]:
                return lexicon[senti][entity]
        return 0

    # pre-process for neg and coo
    negation_logs = dict()  # 记录情感否定信息
    coo_entities = dict()
    for parc in parcs:
        if parc[0] == 'ADV' and parc[2][1] in NEGATION_WORDS:
            negation_logs[parc[1][0]] = parc[2][1] + parc[1][1]
        if parc[0] == 'VOB' and parc[1][1] in NEGATION_WORDS:
            negation_logs[parc[2][0]] = parc[1][1] + parc[2][1]
        if parc[0] == 'COO' and _is_entity(parc, 1) and _is_entity(parc, 2):
            coo_entities.setdefault(parc[1][0], []).append(parc[2][0])
    # sentiment pair extraction (entity -> opinion)
    for parc in parcs:
        # 主谓/动宾/前宾
        if (parc[0] == 'VOB' and _in_lexicon(parc[1][1], parc[2][1]) and _is_entity(parc, 2)) or \
                (parc[0] == 'SBV' and _in_lexicon(parc[1][1], parc[2][1]) and _is_entity(parc, 2)) or \
                (parc[0] == 'FOB' and _in_lexicon(parc[1][1], parc[2][1]) and _is_entity(parc, 2)) or \
                (parc[0] == 'ADV' and _in_lexicon(parc[1][1], parc[2][1]) and _is_entity(parc, 2)):
            score = _get_score(parc[1][1], parc[2][1]) * (-1 if parc[1][0] in negation_logs else 1)
            entity2score[parc[2][0]] = score
            dualistics[parc[2][0]] = parc[1][0]
            this_entities.add(parc[2][0])
        # 修饰关系(定中)
        if (parc[0] == 'ATT' and _is_entity(parc, 1) and _in_lexicon(parc[2][1], parc[1][1])) or \
                (parc[0] == 'CMP' and _is_entity(parc, 1) and _in_lexicon(parc[2][1], parc[1][1])):
            score = _get_score(parc[2][1], parc[1][1]) * (-1 if parc[2][0] in negation_logs else 1)
            entity2score[parc[1][0]] = score
            dualistics[parc[1][0]] = parc[2][0]
            this_entities.add(parc[1][0])
        if parc[0] == 'ATT' and _in_lexicon(parc[1][1], parc[2][1]) and _is_entity(parc, 2):  # ?
            score = _get_score(parc[1][1], parc[2][1]) * (-1 if parc[1][0] in negation_logs else 1)
            entity2score[parc[2][0]] = score
            dualistics[parc[2][0]] = parc[1][0]
            this_entities.add(parc[2][0])
        # 复合动宾关系
        if parc[0] == 'VOB' and _in_lexicon(parc[1][1], _DEFAULT_ENTITY) and postags[parc[2][0]] == 'v':  # 复合VOB
            for parc_ in parcs:
                if parc_[0] == 'VOB' and parc_[1][0] == parc[2][0] and _is_entity(parc_, 2) and _in_lexicon(parc[1][1], parc_[2][1]):
                    score = _get_score(parc[1][1], parc_[2][1]) * (-1 if parc[1][0] in negation_logs else 1)
                    entity2score[parc_[2][0]] = score
                    dualistics[parc_[2][0]] = parc[1][0]
                    this_entities.add(parc_[2][0])
        if parc[0] == 'VOB' and _in_lexicon(parc[2][1], _DEFAULT_ENTITY) and postags[parc[2][0]] != 'v' and parc[1][1] == '是':
            for parc_ in parcs:
                if parc_[0] == 'SBV' and parc_[1][0] == parc[1][0] and _is_entity(parc_, 2) and _in_lexicon(parc[2][1], parc_[2][1]):
                    score = _get_score(parc[2][1], parc_[2][1]) * (-1 if parc[2][0] in negation_logs else 1)
                    entity2score[parc_[2][0]] = score
                    dualistics[parc_[2][0]] = parc[2][0]
                    this_entities.add(parc_[2][0])
        if parc[0] == 'VOB' and _in_lexicon(parc[2][1], _DEFAULT_ENTITY) and postags[parc[1][0]] == 'v':  # SBV-VOB
            for parc_ in parcs:
                if parc_[0] == 'SBV' and parc_[1][0] == parc[1][0] and _is_entity(parc_, 2) and _in_lexicon(parc[2][1], parc_[2][1]):
                    score = _get_score(parc[2][1], parc_[2][1]) * (-1 if parc[2][0] in negation_logs else 1)
                    entity2score[parc_[2][0]] = score
                    dualistics[parc_[2][0]] = parc[2][0]
                    this_entities.add(parc_[2][0])
    # process coo-appearing entities
    dual_items = copy.deepcopy(dualistics).items()
    for entity_idx, senti_idx in dual_items:
        if entity_idx in coo_entities:
            for coo_index in coo_entities[entity_idx]:
                dualistics[coo_index] = dualistics.get(coo_index, dualistics[entity_idx])
    e2s_items = copy.deepcopy(entity2score).items()
    for entity_idx, senti_score in e2s_items:
        if entity_idx in coo_entities:
            for coo_index in coo_entities[entity_idx]:
                entity2score[coo_index] = entity2score.get(coo_index, entity2score[entity_idx])
    if debug:
        print(' - this_entities:', ' / '.join(words[idx] for idx in this_entities), file=file)
        print(' - this_lexicon:', ' / '.join(words[idx] for idx in this_lexicon), file=file)
        print(' - dualistics:', ', '.join(
            '(%d/%s: %d/%s)' % (entity_idx, words[entity_idx], senti_idx, words[senti_idx]) for entity_idx, senti_idx in
            dualistics.items()), file=file)
        print(' - sentiment_score:', ', '.join(
            '(%d/%s: %d)' % (entity_idx, words[entity_idx], senti_score) for entity_idx, senti_score in
            entity2score.items()), file=file)
    # prepare results
    sentiments_list = []
    for entity_idx, senti_idx in dualistics.items():
        entity = words[entity_idx]
        senti_word = negation_logs.get(senti_idx, words[senti_idx])
        senti_score = entity2score.get(entity_idx, 0)
        senti_str = '正面' if senti_score > 0 else '负面'
        sentiments_list.append((entity, senti_word, senti_str))
    words.remove('HED')  # don't forget this!
    return sentiments_list, dualistics


def detect_aspects(words, aspects_info, va2aspect, dualistics,
                   debug=False, file=sys.stdout):
    """根据aspect & va2aspect等资源，匹配式监测可能存在的aspect信息
    由于va2aspect同时附带情感信息，如果基于va2aspect匹配出aspect，会同时输出情感搭配；
    输入参数含有情感分析模块返回的dualistics，主要是用于过滤掉已经被情感分析模块得到的情感搭配（这里相当于只是补漏）
    """
    term2aspect, lv1_aspects, lv2_aspects = aspects_info
    aspects = []
    potential_sentiments = []
    for word_idx, word in enumerate(words):
        if word in term2aspect:
            aspects.append(word)
        else:
            if word in va2aspect and word_idx not in dualistics.values():
                aspect = va2aspect[word][0]
                aspects.append(aspect)
                # check negations
                reverse = False
                for idx in (word_idx - 1, word_idx - 2):
                    if idx >= 0 and words[idx] in NEGATION_WORDS:
                        reverse = True
                        break
                # sentiment info
                senti_score = (-1 if reverse else 1) * va2aspect[word][1]
                senti_str = '正面' if senti_score > 0 else '负面'
                potential_sentiments.append((aspect, word, senti_str))
    if debug:
        print(' - aspects:', aspects, file=file)
        print(' - va-senti:', potential_sentiments, file=file)
    return aspects, potential_sentiments


def predict_text(words, model, nn_kwargs):
    """利用训练好的神经网络模型，对Sentiment/Aspect分类"""
    maxlen = nn_kwargs['maxlen']
    word2index = nn_kwargs['word2index']
    index2label = nn_kwargs['index2label']
    # data encode
    seqs = [word2index.get(word, 1) for word in words]
    seqs = pad_sequences([seqs], maxlen=maxlen, padding='post', truncating='post')
    # predict
    preds = model.predict(seqs)
    pred = np.argmax(preds[0], axis=-1)
    label = index2label[pred]
    return label


def refine_sentiments(sentiments, term2aspect):
    """后处理已经得到的aspect-sentiment结果
    后处理内容：
        - 有更具体的大类的话，去掉通用的类别（比如“Surface的外观”，匹配外观而不匹配Surface）
        - 对某个大类，如果有更小的子类匹配上，删去这个大类的通用描述类别
    """
    # sentiment: (entity, opinion, sentiment)
    if len(sentiments) <= 1:
        return sentiments
    # delete general aspect (surface) if more specific aspects exist
    has_specific = False
    for sentiment in sentiments:
        if not term2aspect.get(sentiment[0], 'surface').split('-')[0] == 'surface':
            has_specific = True
            break
    if has_specific:
        sentiments = [sentiment for sentiment in sentiments if
                      term2aspect.get(sentiment[0], 'surface').split('-')[0] != 'surface']
    # delete general if specific aspects exist (within certain aspect class)
    specific_aspects = set()
    for sentiment in sentiments:
        aspect = term2aspect.get(sentiment[0], 'null')
        if '-' in aspect:
            specific_aspects.add(aspect.split('-')[0])  # log lv1 aspect name
    if specific_aspects:
        sentiments = [sentiment for sentiment in sentiments if
                      term2aspect.get(sentiment[0], 'null') not in specific_aspects]  # remove aspect with lv1 only
    return sentiments


def analysis_comment(text, entities, lexicon, aspects_info, va2aspect, va_match,
                     model1, nn_kwargs1, model2, nn_kwargs2,
                     debug=False, file=sys.stdout, api_debug=False, use_nn=True):
    """处理单条评论的api接口
    处理流程：
        - 预处理
        - 分句
        - 逐句：
            - 情感分析
            - aspect抽取
            - 结果后处理
        - 汇总得到整个评论的结果
    """
    term2aspect, lv1_aspects, lv2_aspects = aspects_info

    def _format_aspect(aspect):
        aspect_class = term2aspect.get(aspect, '未知类别')
        if aspect_class in lv2_aspects:
            aspect_class = term2aspect.get(aspect_class) + '-' + aspect_class
        return '{} ({})'.format(aspect, aspect_class)

    def _format_sentiment(sentiment, verbose=1):
        # sentiment: (entity, opinion, sentiment)
        if verbose:
            return '{} ({}) {}'.format(sentiment[0], term2aspect.get(sentiment[0], sentiment[0]), sentiment[2])
        else:
            return '{} {}'.format(term2aspect.get(sentiment[0], sentiment[0]), sentiment[2])

    text = clean_text(text)
    sents = split_sentences(text)
    total_aspects = []
    total_sentiments = []
    total_nn_aspects = []
    details = dict()
    if debug:
        print('\n{}'.format(text), file=file)
    for sent_idx, sent in enumerate(sents):
        if debug:
            print('\nsent {}: {}'.format(sent_idx, sent), file=file)
        words, postags, arcs = grammar_analysis(sent, entities, lexicon)
        # sentiment & aspect
        sentiments, dualistics = sentiment_analysis(sent, words, postags, arcs, lexicon, debug=debug, file=file)
        aspects, potential_sentiments = detect_aspects(words, aspects_info, va2aspect, dualistics, debug=debug, file=file)
        # process:
        # only keep aspects that are pre-defined
        sentiments = [sentiment for sentiment in sentiments if sentiment[0] in term2aspect]
        if use_nn:
            nn_aspect = predict_text(words, model1, nn_kwargs1)
            nn_sentiment = predict_text(words, model2, nn_kwargs2)
        # add potential sentiments found by aspect detecting
        for potential_sentiment in potential_sentiments:
            if potential_sentiment not in sentiments:
                sentiments.append(potential_sentiment)
        sentiments = refine_sentiments(sentiments, term2aspect)
        if debug:
            print(' - tokens:', words, file=file)
            print(' - aspects:', ' | '.join(_format_aspect(aspect) for aspect in aspects), file=file)
            print(' - sentiments:', ' | '.join(_format_sentiment(sentiment) for sentiment in sentiments), file=file)
            if use_nn:
                print(' - nn aspect:', _format_aspect(nn_aspect), file=file)
                print(' - nn sentiment:', nn_sentiment, file=file)
        # fix1: attempt whole match
        if not sentiments:
            if sent in va_match or (words.count(words[0]) == len(words) and words[0] in va_match):
                word = sent if sent in va_match else words[0]
                sentiments.append((va_match[word][0], word, '正面' if va_match[word][1] > 0 else '负面'))
        """
        # fix2: fix fine-grained sentiment results by nn results （这个有风险，提升recall的同时会明显降低precision）
        if not sentiments and not nn_aspect == '以上都不属于' and not nn_sentiment == '无情感' and not nn_sentiment == '句中包含多种情感':
            for aspect in aspects:
                if aspect in term2aspect:
                    sentiments.append((aspect, '? ', nn_sentiment))
        """
        if debug:
            print(' - sentiments (refine):',
                  ' | '.join(_format_sentiment(sentiment) for sentiment in sentiments), file=file)
        # log detailed text (grouped by aspects)
        for sentiment in sentiments:  # sentiment: (entity, opinion, sentiment)
            # details: [aspect][polarity] -> text
            details.setdefault(term2aspect[sentiment[0]], dict()).setdefault(sentiment[2], Counter()).update([sent])

        # add sentence results to total_list
        if aspects:
            total_aspects.extend(aspects)
        if sentiments:
            total_sentiments.extend(sentiments)
        if use_nn:
            if not nn_aspect == '以上都不属于':
                total_nn_aspects.append(nn_aspect)
    # refine ??
    # total_sentiments = refine_sentiments(total_sentiments, term2aspect)

    # format
    total_aspects_str = ' | '.join(unique_everseen(_format_aspect(aspect) for aspect in total_aspects))
    total_sentiments_str_verbose = ' | '.join(unique_everseen(_format_sentiment(sentiment) for sentiment in total_sentiments))
    total_sentiments_str = ' | '.join(unique_everseen(_format_sentiment(sentiment, verbose=0) for sentiment in total_sentiments))
    total_nn_aspects_str = ' | '.join(unique_everseen(total_nn_aspect for total_nn_aspect in total_nn_aspects)) if use_nn else None
    total_nn_sentiment_str = predict_text(list(_segmentor.segment(text)), model2, nn_kwargs2) if use_nn else None

    if debug:
        print('\ntext:', text, file=file)
        print('total aspects:', total_aspects_str, file=file)
        print('total sentiments:', total_sentiments_str, file=file)
        print('total sentiments (verbose):', total_sentiments_str_verbose, file=file)
        print('total nn aspect:', total_nn_aspects_str, file=file)
        print('total nn sentiment:', total_nn_sentiment_str, file=file)
        print('=' * 30 + '\n', file=file, flush=True)

    if api_debug:
        total_sentiments_str = total_sentiments_str_verbose

    return total_aspects_str, total_sentiments_str, total_nn_aspects_str, total_nn_sentiment_str, details


def init(use_nn=True):
    """初始化语料库等资源"""
    ltp_init()
    aspects_info = load_aspects(path='libs/aspects.txt')
    va2aspect = load_va2aspect('libs/va2aspect.txt')
    va_match = load_vamatch('libs/va_match.txt')
    lexicon = load_sentiment_lexicon(path='libs/sentiment_lexicon.txt')
    print('loading nn model')
    model1 = load_model('libs/aspect-model.h5') if use_nn else None
    model2 = load_model('libs/sentiment-model.h5') if use_nn else None
    nn_kwargs1 = pickle.load(open('libs/aspect-nnargs.pkl', 'rb')) if use_nn else None
    nn_kwargs2 = pickle.load(open('libs/sentiment-nnargs.pkl', 'rb')) if use_nn else None
    return {
        'aspects_info': aspects_info,
        'va2aspect': va2aspect,
        'va_match': va_match,
        'lexicon': lexicon,
        'entities': ENTITY_WHITELIST,
        'model1': model1,
        'nn_kwargs1': nn_kwargs1,
        'model2': model2,
        'nn_kwargs2': nn_kwargs2
    }


if __name__ == '__main__':
    print(clean_text('感觉很好啊'))

