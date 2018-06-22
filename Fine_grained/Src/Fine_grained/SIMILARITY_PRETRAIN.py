# import sys
# import imp
# imp.reload(sys)
def pretrain(product):
    from CONFIG import Config
    import gensim
    conf=Config(product)
    model=gensim.models.Word2Vec.load(conf.WORD2VEC_PATH)
    ent_set=read_set(conf.WHOLE_PART_PATH)
    attr_set=read_set(conf.ENTITY_ATTRIBUTE_PATH)-ent_set
    similarity_ent=pretrain_set(model, ent_set)
    similarity_attr=pretrain_set(model, attr_set)
    write_dict(conf.SIMILARITY_ENTITY_PATH,similarity_ent)
    write_dict(conf.SIMILARITY_ATTRIBUTE_PATH,similarity_attr)

def write_dict(file_path,dict):
    import pickle
    f=open(file_path,'wb')
    pickle.dump(dict,f)
    f.close()

def pretrain_set(model, word_set):
    import itertools
    similarity=dict()
    process=0
    all=len(word_set)*len(word_set)
    for x in itertools.product(word_set,word_set):
        process=process+1
        if process % 50==1:
            print("%d of %d"%(process-1,all))
        word1=x[0]
        word2=x[1]
        combine=combine_word(word1,word2)
        if combine in similarity:
            pass
        elif word1==word2:
            similarity[combine]=1
        elif word1 in model.wv.index2entity and word2 in model.wv.index2entity:
            similarity[combine]=model.similarity(word1,word2)
        else:
            similarity[combine]=0
    return similarity

def combine_word(word1,word2):
    combine=word1+'-'+word2
    if word1>word2:
        combine=word2+'-'+word1
    return  combine

def read_set(file_path):
    words=set()
    with open(file_path, 'r', encoding='utf8') as fr:
        for line in fr:
            words.update(set(line.split()))
    return words



if __name__=='__main__':
    import time
    for product in ['汽车','手机']:
        start=time.time()
        pretrain(product)
        print('%s word2vec similarity pretrain done,time use: %d sec'%(product,time.time()-start))