import React from 'react';
import {Button, Checkbox, Select} from 'antd';
import axios from 'axios';
import {filterFiles} from './utils';
import {IFile} from './types';
import SyntaxHighlighter from 'react-syntax-highlighter';
import { docco } from 'react-syntax-highlighter/dist/esm/styles/hljs';
import { locales } from './constants';

import 'normalize.css/normalize.css';
import 'antd/dist/antd.min.css';
import './App.css';

const Option = Select.Option;
const instance = axios.create({
  timeout: 60 * 1000,
});

interface AppState {
  files: IFile[];
  checkedList: string[];
  indeterminate: boolean;
  checkAll: boolean;
  processing: boolean;
  transJsons: any[];
  locale?: string;
  from?: string;
}

export default class App extends React.Component<{}, AppState> {
  state: AppState = {
    files: [],
    checkedList: [],
    checkAll: false,
    indeterminate: false,
    processing: false,
    transJsons: [],
  };

  private whiteList: string[] = ['directory', 'webkitdirectory', 'mozdirectory', 'nwdirectory'];
  inputRef: any = React.createRef();

  async componentDidMount() {
    await Notification.requestPermission();
    this.whiteList.forEach(dic => {
      this.inputRef.current[dic] = true;
    });
  }

  handleFileSelect = () => {
    this.inputRef.current.click();
  }

  handleFileChange = () => {
    const files = this.inputRef.current.files;
    if (!files || files.length === 0) {
      return;
    }
    const validFiles = filterFiles(files);
    this.setState({
      files: validFiles,
    });
  }

  parseJson = (file: IFile) => {
    return new Promise((resolve, reject) => {
      // 解析json
      const reader = new FileReader();
      reader.readAsText(file); // 读取文件的内容
      reader.onload = () => {
        if (!reader.result) {
          reject(new Error('格式错误'));
        } else {
          try {
            resolve(JSON.parse(reader.result as string));
          } catch (e) {
            reject(new Error('格式错误'));
          }
        }
      }
    });
  }

  handleStart = async () => {
    this.setState({
      processing: true,
    });
    for await (const [index, file] of this.state.files.entries()) {
      if (this.state.checkedList.includes(file.id)) {
        file.status = 1;
        this.setState((prevState) => {
          const files = prevState.files;
          files.splice(index, 1, file);
          return {
            files,
          }
        });
        try {
          const parsedJson: any = await this.parseJson(file);
          let count = 0;
          const arr: any = [];
          const keys = Object.keys(parsedJson);
          keys.forEach((key, index) => {
            if (index >= (count + 1) * 10) {
              count++;
            }
            if (arr[count] === undefined) {
              arr[count] = {};
            }
            arr[count][key] = parsedJson[key];
          });
          let transJson = {};
          for (const item of arr) {
            const params: any = {
              text: item,
              to: this.state.locale,
            };
            if (this.state.from) {
              params.from = this.state.from;
            }
            const res = await instance.post('http://localhost:3010/api/trans', params);
            transJson = {
                ...transJson,
                ...res.data,
            };
            const { transJsons } = this.state;
            const idx = transJsons.findIndex(item => item.name === file.webkitRelativePath);
            if (idx === -1) {
              transJsons.push({
                name: file.webkitRelativePath,
                total: Object.keys(parsedJson).length,
                current: Object.keys(transJson).length,
                content: transJson,
              });
            } else {
              const obj = transJsons[idx];
              obj.content = transJson;
              obj.current = Object.keys(transJson).length;
              transJsons.splice(idx, 1, obj);
            }
            this.setState({
              transJsons,
            });
          }
          this.setState(prevState => {
            file.status = 2;
            const files = prevState.files;
            files.splice(index, 1, file);
            return {
              files,
            }
          });
          // 调用通知
          new Notification('机翻完成提示', {
            body: file.webkitRelativePath
          });
          // 机翻完成自动下载
          this.downloadFile(file.webkitRelativePath, JSON.stringify(transJson), this.state.locale!);
        } catch (err) {
          if (err.message === '格式错误') {
            file.status = 3;
          } else {
            file.status = 4;
          }
          this.setState((prevState) => {
            const files = prevState.files;
            files.splice(index, 1, file);
            return {
              files,
            }
          });
        }
      }
    }
  }

  downloadFile = (fileName: string, content: string, locale: string) => {
    const name = fileName.split('.')[0].replace('/', '_');
    const anchor = document.createElement('a');
    const blob = new Blob([content]);
    const url = URL.createObjectURL(blob);
    anchor.href = url;
    anchor.download = `${name}_${locale}.json`;
    const evt = document.createEvent('Events');
    evt.initEvent('click', false, false);
    document.body.appendChild(anchor);
    anchor.click();
    URL.revokeObjectURL(url);
    document.body.removeChild(anchor);
  }

  onChange = (checkedList: any[]) => {
    const { files } = this.state;

    this.setState({
      checkedList,
      indeterminate: !!checkedList.length && checkedList.length < files.length,
      checkAll: checkedList.length === files.length,
    });
  }

  onCheckAllChange = (e: any) => {
    const checkedList = e.target.checked ? this.state.files.map(file => file.id) : [];

    this.setState({
      checkedList,
      indeterminate: false,
      checkAll: e.target.checked,
    });
  }

  handleFromChange = (value: string) => {
    this.setState({
      from: value,
    });
  }

  handleChange = (value: string) => {
    const files = this.state.files;
    files.forEach(file => {
      file.status = 0;
    });
    this.setState({
      locale: value,
      files,
    });
  }

  render() {
    return <div className="App">
      <div className="aside">
        <div className="toolbox">
          <Button type="primary" onClick={this.handleFileSelect}>选择文件夹</Button>
          {
            this.state.checkedList.length > 0 && this.state.locale ?
                <Button type="primary" style={{ marginLeft: '20px' }} onClick={this.handleStart}>开始机翻</Button> : null
          }
        </div>
        <input type="file" multiple={true} style={{ display: 'none' }} ref={this.inputRef} onChange={this.handleFileChange} />
        <Checkbox
            style={{ margin: '10px 0' }}
            indeterminate={this.state.indeterminate}
            onChange={this.onCheckAllChange}
            checked={this.state.checkAll}
        >
          选择所有
        </Checkbox>
        <Select
            placeholder="选择机翻源语言"
            size={'small'}
            style={{ width: 200, marginLeft: '50px' }}
            onChange={this.handleFromChange}>
          {
            locales.map(locale => {
              return <Option key={locale.value} value={locale.value}>【{locale.text}】{locale.label}</Option>
            })
          }
        </Select>
        <Select
            placeholder="选择机翻目标语言"
            size={'small'}
            style={{ width: 200, marginLeft: '50px' }}
            onChange={this.handleChange}>
          {
            locales.map(locale => {
              return <Option key={locale.value} value={locale.value}>【{locale.text}】{locale.label}</Option>
            })
          }
        </Select>
        <div className="file-list">
          <Checkbox.Group onChange={this.onChange} value={this.state.checkedList}>
            {
              this.state.files.map(file => (
                  <p key={file.id}>
                    <Checkbox value={file.id}>
                      {
                        this.state.processing && this.state.checkedList.includes(file.id) ?
                            <span className={`status-${file.status}`}>
                              {
                                file.status === 0
                                    ? '（队列中）'
                                    : file.status === 1
                                        ? '（处理中）'
                                        : file.status === 2
                                            ? '（已完成）'
                                            : file.status === 3
                                                ? '（格式错误）'
                                                : '（服务异常）'
                              }
                            </span> : null
                      }
                      {file.webkitRelativePath}
                    </Checkbox>
                  </p>
              ))
            }
          </Checkbox.Group>
        </div>
        <div className="content-list">
          {
            this.state.transJsons.map(item => {
              return <div key={item.name} className="content-list__item">
                <h3>({item.current}/{item.total})&nbsp;&nbsp;{item.name}</h3>
                <div>
                  <SyntaxHighlighter language="json" style={docco}>
                    {JSON.stringify(item.content, null, 4)}
                  </SyntaxHighlighter>
                </div>
              </div>
            })
          }
        </div>
      </div>
    </div>;
  }
}
