# react-native-multi-analyzer

React Native bundle visulizer, out of box tools.   
Also support analyzing of multiple bundles splitted with amazing [metro-code-split](https://github.com/wuba/metro-code-split). 

## Inspiration

Based on [source-map-explorer](https://github.com/danvk/source-map-explorer) to show the visulization. 

## How To Use

### Install

```ts
npm i react-native-multibundle-analyzer | yarn add react-native-multibundle-analyzer
```

### Usage

```ts
yarn run rn-multi-analyzer // by default, bundle the project directly and open in Browser
```

## Configuration

All options are optional.

| Argument | Description | Default Value|
|:---:|---|:---:|
|multi|Decide how to bundle the project. Setting `true` indicating to use **metro-code-split** to split bundle, must install it first or the visualization will fail.| false|
|entry-file|[See details Below](###entry-file-description)|``"main"`` in package.json or ``"index.js"``|
|platform|Which platform to bundle for, could be ``ios`` or ``android``|``ios``|
|format| Visulization output in specific formats, could be one of `html` &#124; `json` &#124; `tsv` | ``html``|

## entry-file-description

### Single Bundle mode

**entry-file don't exists**  

- `main` field of package.json ｜ "index.js". 

**entry-file exists**

- entry-file value

### Multi Bundle Mode

**entry-file exists**

> if entry-file is an actual js document: 
- `entry-file` and `common.js`(automatically added with help of [metro-code-split](https://github.com/wuba/metro-code-split))

> Entry-file could also be a json file which content is Array, this could be appled to multi-entry circumstance.
```json
[
    "index.js",
    "business.js"
]
```

**entry-file don't exists**

- `main` field of package.json ｜ `index.js` and `common.js`(automatically added with help of [metro-code-split](https://github.com/wuba/metro-code-split))

