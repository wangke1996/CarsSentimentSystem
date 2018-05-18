from Fine_grained.Src.Fine_grained.FINE_GRAINED import analysis_comment
import multiprocessing as mp
from time import time,sleep
from global_var import gl
def analysis_process(pid, tasks, task_num, state_queue, child_conn, request_queue):
    process_result=[]
    init_data=pipe_request(request_queue=request_queue, child_conn=child_conn, id=pid, var_name='INIT_DATA')
    model=pipe_request(request_queue=request_queue, child_conn=child_conn, id=pid, var_name='WORD2VEC_MODEL')
    while True:
        if tasks.empty():
            break
        try:
            text=tasks.get(False)
        except Exception as e:
            continue
        pipe_request(request_queue=request_queue, child_conn=child_conn, id=pid, var_name='PROGRESS', value=round(100 * (task_num - tasks.qsize()) / task_num), type='post')
        _,single_result=analysis_comment(pid=pid,text=text,init_data=init_data,model=model)
        process_result.extend(single_result)
    state_queue.put(process_result)
    pipe_request(request_queue=request_queue, child_conn=child_conn, id=pid, var_name=None, type='close')

def pipe_request(request_queue,child_conn,id,var_name,value=None,type='get'):
    child_conn.send([var_name,value,type])
    request_queue.put(id)
    if type=='get':
        return child_conn.recv()
    return None

def pip_response(request_queue,parent_conns,thread_num):
    finish_pid=[]
    while True:
        try:
            id=request_queue.get(False)
            request=parent_conns[id].recv()
            var_name=request[0]
            value=request[1]
            type=request[2]
            if type=='get':
                value= gl.get_value(var_name)
                parent_conns[id].send(value)
            elif type=='post':
                gl.set_value(var_name,value)
            elif type=='close':
                finish_pid.append(id)
                if len(finish_pid)==thread_num:
                    break
        except Exception as e:
            sleep(1)
            continue

def gen_summary(texts=None, filename=None, thread_num=mp.cpu_count()):
    if not texts:
        texts = load_texts(filename)
    ctx=mp.get_context('spawn')
    # manager=mp.Manager()
    # mp.freeze_support()
    tasks=ctx.Queue(len(texts))
    state_queue=ctx.Queue(thread_num)
    parent_conns=[]
    request_queue = ctx.Queue()
    thread_list=[]
    for text in texts:
        tasks.put(text)
    task_num=tasks.qsize()
    # gl.set_value('INIT_DATA',init_data)
    start=time()
    for i in range(thread_num):
        parent_conn, child_conn = ctx.Pipe()
        parent_conns.append(parent_conn)
        p = ctx.Process(target=analysis_process, args=(i, tasks, task_num, state_queue, child_conn, request_queue,))
        thread_list.append(p)
    for p in thread_list:
        p.start()
    pip_response(request_queue,parent_conns,thread_num)
    # for p in thread_list:
    #     p.join()
    gl.set_value('PROGRESS',100)
    print('single analysis by %d process, %d comments time use: %ds' % (thread_num,task_num,time()-start))
    # p=Process(target=analysis_process,args=(tasks,tasks.qsize(),state_list,lock,init_data))
    # p.start()
    # p.join()

    ent_attr_polar=dict()
    ent_attr_text=dict()
    while not state_queue.empty():
        state_list=state_queue.get()
        for state in state_list:
            ent=state.this_entity_name
            attr=state.this_attribute_name
            polar=state.this_score
            txt=state.text
            attr_polars=ent_attr_polar.setdefault(ent+'-'+attr,[0,0,0]) # value is the number of positive/neural/negative reviews of the attribute
            txts = ent_attr_text.setdefault(ent+'-'+attr,[[],[],[]]) # value is the set of pos/neu/neg reviews of the entity
            if polar==1:
                if txt not in txts[0]:
                    attr_polars[0]=attr_polars[0]+1
                    txts[0].append(txt)
            elif polar==0:
                if txt not in txts[1]:
                    attr_polars[1]=attr_polars[1]+1
                    txts[1].append(txt)
            elif polar==-1:
                if txt not in txts[2]:
                    attr_polars[2]=attr_polars[2]+1
                    txts[2].append(txt)
            else:
                pass

            ent_attr_polar[ent+'-'+attr]=attr_polars
            ent_attr_text[ent+'-'+attr]=txts
        #total = 0
        # smr = dict()
            # aspects, sentiments, nn_aspect, nn_sentiment, details = analysis_comment(text, debug=False, use_nn=use_nn, **init_data)
    #     for aspect in details.keys():
    #         if '-' in aspect:
    #             lv1, lv2 = aspect.split('-')
    #         else:
    #             lv1, lv2 = aspect, GENERAL
    #         for pol in details[aspect].keys():
    #             smr.setdefault(lv1, dict()).setdefault(lv2, dict()).setdefault(pol, Counter()).update(details[aspect][pol])
    #             total += len(details[aspect][pol])
    # # pprint(smr)
    # print(total)

    # counter = dict()
    # for lv1 in smr:
    #     for lv2 in smr[lv1]:
    #         # pos-num, neg-num, all-num, pos-rate, neg-rate, all-rate
    #         counter.setdefault(lv1, dict()).setdefault(lv2, [0, 0, 0, .0, .0, .0])
    #         counter[lv1][lv2][0] = len(smr[lv1][lv2].get('正面', dict()))
    #         counter[lv1][lv2][1] = len(smr[lv1][lv2].get('负面', dict()))
    #         counter[lv1][lv2][2] = counter[lv1][lv2][0] + counter[lv1][lv2][1]
    #         counter[lv1][lv2][3] = '{:.3%}'.format(counter[lv1][lv2][0] / total)
    #         counter[lv1][lv2][4] = '{:.3%}'.format(counter[lv1][lv2][1] / total)
    #         counter[lv1][lv2][5] = '{:.3%}'.format(counter[lv1][lv2][2] / total)
    # pprint(counter)
    # write to csv
    # headers = ['一级分类', '二级分类', '评价极性', '评价数目', '评价占比', '评价示例']
    # rows = []
    # for lv1 in smr:
    #     for lv2 in smr[lv1]:
    #         if counter[lv1][lv2][0] > 0:
    #             rows.append({
    #                 '一级分类': lv1,
    #                 '二级分类': lv2,
    #                 '评价极性': '正面',
    #                 '评价数目': counter[lv1][lv2][0],
    #                 '评价占比': counter[lv1][lv2][3],
    #                 '评价示例': ' || '.join(smr[lv1][lv2]['正面'].keys())
    #             })
    #         if counter[lv1][lv2][1] > 0:
    #             rows.append({
    #                 '一级分类': lv1,
    #                 '二级分类': lv2,
    #                 '评价极性': '负面',
    #                 '评价数目': counter[lv1][lv2][1],
    #                 '评价占比': counter[lv1][lv2][4],
    #                 '评价示例': ' || '.join(smr[lv1][lv2]['负面'].keys())
    #             })
    headers = ['实体', '属性', '评价极性', '评价数目', '评价占比', '评价示例']
    rows = []
    for ent_attr,polars in ent_attr_polar.items():
        ent=ent_attr.split('-')[0]
        attr=ent_attr.split('-')[1]
        total=polars[0]+polars[1]+polars[2]
        if total==0:
            total=1
        rows.append({'实体': ent, '属性': attr, '评价极性': '正面', '评价数目': polars[0],
                     '评价占比': polars[0] / total,
                     '评价示例': ' || '.join(ent_attr_text[ent_attr][0])})
        rows.append({'实体': ent, '属性': attr, '评价极性': '中性', '评价数目': polars[1],
                     '评价占比': polars[1] / total,
                     '评价示例': ' || '.join(ent_attr_text[ent_attr][1])})

        rows.append({'实体': ent, '属性': attr, '评价极性': '负面', '评价数目': polars[2],
                     '评价占比': polars[2] / total,
                     '评价示例': ' || '.join(ent_attr_text[ent_attr][2])})
    csv_filepath = filename.replace('.txt', '.csv')
    with codecs.open('./static/downloads/' + csv_filepath, 'w', 'utf-8-sig') as fw:
        f_csv = csv.DictWriter(fw, headers)
        f_csv.writeheader()
        f_csv.writerows(rows)
    return ent_attr_polar,ent_attr_text, csv_filepath
import csv

import codecs


GENERAL = '整体描述'

def load_texts(filename):
    texts = []
    try:
        with open('./uploads/' + filename, 'r', encoding='utf8') as fr:
            for line in fr:
                    texts.append(line.strip())
    except:
        pass
    return texts


def main():
    pass


if __name__ == '__main__':
    main()

    print('\nProcess finished')

