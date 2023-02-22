# %%
import cv2
import time
import json
import urllib
import numpy as np

from PIL import Image
from django.shortcuts import render
from django.http import HttpResponse

from .toolbox.overview import resource_table_input_data, public_columns


# %%
'''
Index home page
'''


def index(request):
    context = dict(
        date=time.ctime()
    )
    return render(request, 'index.html', context)


# %%
'''
Require resources json,
the available images are returned.
'''


def resources(request):
    df = resource_table_input_data[public_columns]

    parse = parse_request(request)

    if parse.query:
        df = df.query(parse.query)

    df.index = range(len(df))
    print(request, len(df))

    data = df.to_json()

    return HttpResponse(data, content_type='application/json')


# %%
'''
Require the image channel,
the image is specified by the request
'''


def image_channels(request):
    print('Request image channels')
    df = resource_table_input_data

    parse = parse_request(request)
    dct = split_parse(parse)
    select = df.query(
        'module=="{module}" & set=="{set}" & name=="{name}"'.format(**dct))

    img = Image.open(select.iloc[0]['fullPath'])
    rgb = np.array(img)
    hsv = cv2.cvtColor(rgb, cv2.COLOR_RGB2HSV)
    hls = cv2.cvtColor(rgb, cv2.COLOR_RGB2HLS)
    dct['shape'] = rgb.shape

    for name, channel, data in zip(['red', 'green', 'blue', 'hue', 'saturation', 'value', 'brightness'],
                                   [0, 1, 2, 0, 1, 2, 1],
                                   [rgb, rgb, rgb, hsv, hsv, hsv, hls]):
        d = data[:, :, channel]

        hist = np.histogram(d, bins=255, range=(0, 255))
        dct['channel_' + name] = tuple([int(e) for e in hist[0]])

    dct['bins'] = tuple([int(e) for e in hist[1]])
    dct['dim'] = 255
    dct['dim_hue'] = 180

    return HttpResponse(json.dumps(dct), content_type='application/json')

# %%


class AllBrainRDMData(object):
    def __init__(self):
        self.module = 'brain_data'
        self.data = dict()
        pass

    def get_all_rdm(self, setName):
        if setName in self.data:
            print('Using existing data: {}/{}'.format(self.module, setName))
            return self.data[setName]

        df = resource_table_input_data
        selected = df.query('module == "{}"'.format(
            self.module)).query('set == "{}"'.format(setName))

        def _get_array(se):
            fullPath = se['fullPath']
            loaded = np.load(fullPath)
            for k in loaded:
                array = loaded[k].astype(np.float64)
                shape = array.shape

                # Average across the subjects
                if len(shape) == 4:
                    array = np.mean(array, axis=0)

                if len(shape) == 3:
                    array = np.mean(array, axis=0)

                break
            return array

        data = dict()
        for idx in selected.index:
            se = selected.loc[idx]
            name = se['name']
            array = _get_array(se)

            if len(array.shape) == 3:
                for i, arr in enumerate(array):
                    data['{}-{:03d}'.format(name, i)] = arr

            if len(array.shape) == 2:
                data[name] = array

        self.data[setName] = data

        return data


all_brain_rdm_data = AllBrainRDMData()


def rdm_compare(request):
    print('Request RDM compare')
    df = resource_table_input_data
    parse = parse_request(request)
    dct = split_parse(parse)
    select = df.query(
        'module=="{module}" & set=="{set}" & name=="{name}"'.format(**dct))

    loaded = np.load(select.iloc[0]['fullPath'])

    # There is only key in the loaded,
    # but the name is not known yet
    for k in loaded:
        data = loaded[k].astype(np.float64)
        break

    all_rdm = all_brain_rdm_data.get_all_rdm(dct['set'])
    names_rdm = sorted([k for k in all_rdm])
    triu = np.triu(data*0+1, 1)
    d = data[triu == 1]
    correlates = []
    for name in names_rdm:
        d1 = all_rdm[name][triu == 1]
        correlates.append(np.corrcoef(d, d1)[0, 1])
    dct['correlates'] = correlates
    dct['names'] = names_rdm
    # print(dct)

    # print(data.shape)
    # print([(k, v.shape)
    #       for k, v in all_brain_rdm_data.get_all_rdm(dct['set']).items()])

    return HttpResponse(json.dumps(dct), content_type='application/json')


# %%
'''
Require the RDM matrix
'''


def rdm(request):
    print('Request RDM')
    df = resource_table_input_data
    parse = parse_request(request)
    dct = split_parse(parse)
    select = df.query(
        'module=="{module}" & set=="{set}" & name=="{name}"'.format(**dct))

    loaded = np.load(select.iloc[0]['fullPath'])

    # There is only key in the loaded,
    # but the name is not known yet
    for k in loaded:
        scale = 1e4
        data = loaded[k]
        raw_shape = data.shape

        # The np.float64 supports to the JSON packing.
        data = (data * scale).astype(np.float64)

        if len(raw_shape) == 4:
            data = np.mean(data, axis=0)
            shape = data.shape
            data = tuple([tuple([tuple(b) for b in a]) for a in data])
            # The dims refers the raw dimensions,
            # in which the subject dimension is averaged.
            dims = ['subject', 'time', 'img', 'img']

        if len(raw_shape) == 3:
            data = np.mean(data, axis=0)
            shape = data.shape
            data = tuple([tuple(e) for e in data])
            # The dims refers the raw dimensions,
            # in which the subject dimension is averaged.
            dims = ['subject', 'img', 'img']

        if len(raw_shape) == 2:
            data = data
            shape = data.shape
            data = tuple([tuple(e) for e in data])
            dims = ['img', 'img']

        dct['key'] = k
        dct['data'] = data
        dct['extent'] = [np.min(data) / scale, np.max(data) / scale]
        dct['rawShape'] = raw_shape
        dct['shape'] = shape
        dct['dims'] = dims
        dct['scale'] = scale

        break

    return HttpResponse(json.dumps(dct), content_type='application/json')

# %%


def parse_request(request):
    safe_path = urllib.parse.unquote(request.get_full_path())
    parse = urllib.parse.urlparse(safe_path)
    return parse


def split_parse(parse):
    dct = dict()
    split = parse.query.split('&')
    for s in split:
        if not '=' in s or len(s) < 3:
            continue
        a, b = s.split('=', 1)
        dct[a.strip()] = b.strip()
    return dct
