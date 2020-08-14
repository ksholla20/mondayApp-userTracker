import React from "react";
import "./App.css";
import mondaySdk from "monday-sdk-js";
import { Dropdown } from 'office-ui-fabric-react/lib/Dropdown';

import { initializeIcons } from 'office-ui-fabric-react/lib/Icons';
import { CommandBarButton, DefaultButton, Modal, ContextualMenu } from 'office-ui-fabric-react';
import { exportComponentAsJPEG, exportComponentAsPDF, exportComponentAsPNG } from "react-component-export-image";
import {LineGraph, BarGraph} from "./chartUtils";
const monday = mondaySdk();

const dropdownStyles = {
    dropdown: { width: 300 },
};

const buttonStyles = {
    root: {height: 44, marginTop: 20}
};

const containerStyles = {
    display: 'flex',
    flexFlow: 'column nowrap',
    alignItems: 'stretch',
    height: "80%",
    width: "80%",
};


class App extends React.Component {
    constructor(props) {
        super(props);
        this.componentRef = React.createRef();
        this.userComponentRef = React.createRef();

        // Default state
        this.state = {
            settings: {},
            name: "",
            viewState: "board",
            isModalOpen: false
        };
    }

    getItems = (groupId) => this.state.boardData.boards[0].items.filter((v=>(v.group.id === groupId))).map((val)=>({
          "id": val.id,
          "updates": val.updates,
          "status": val.column_values.filter((cval)=>(cval.title === "Status"))[0].text,
          "owner": val.column_values.filter((cval)=>(cval.title === "Owner"))[0].text,
          "estimate": Number(val.column_values.filter((cval)=>(cval.title === "Time Est."))[0].text),
      }));
    getTotal = (items) => items.reduce((acc,val)=>acc+val.estimate,0);
    updateUserList (items) {
        const userMap = items.reduce(function(acc,val){acc[val.owner] = true; return acc},{});
        this.setState({userList: Object.keys(userMap)});
        console.log(this.state.userList);
    }
    updateUserChartData (user) {
        const items = this.getItems(this.state.selectedGroupId).filter((v)=>(v.owner === user));
        const tot = this.getTotal(items);
        const dn = items
        .filter((val)=>(val.status === "Done"))
        .map((val)=>({...val, "last_updated": val.updates.filter((vl=>(vl.text_body.split("").reverse().join("").indexOf("enoD") === 0)))[0].created_at}))
        .reduce(function(acc,val){const d = new Date(val.last_updated); const str = [d.getFullYear(),d.getMonth(),d.getDate()].join("/");acc[str] = ((str in acc)?acc[str]:0)+val.estimate; return acc},{});
        const cumulativeSum = (sum => value => sum -= value)(tot);
        const burnStatus = Object.keys(dn).map((k)=>({"date":k,"val":dn[k]})).sort((a,b)=>(new Date(a.date)).getTime() - (new Date(b.date)).getTime()).map((v)=>({...v,"cur":cumulativeSum(v.val)}));
        const userLineData = {
            "labels": ["Begin", ...burnStatus.map((v)=>(v.date))],
            "datasets":[{
                "label": user,
                "data": [tot, ...burnStatus.map((v)=>(v.cur))]
            }]
        };
        this.setState({userLineData:userLineData, selectedUser:user});
    }
    onUserColumnClick = (ev, item) => {
        const user = item[0]['_model'].label;
        this.updateUserChartData(user);
        this.setState({viewState: "user"});
    }
    updateChartData(groupId, groupTitle) {
        const items = this.getItems(groupId, groupTitle);
        this.updateUserList(items);
        const userData = this.state.userList.map((user)=>(this.getTotal(items.filter((v)=>(v.owner === user)))));
        const userDoneData = this.state.userList.map((user)=>(this.getTotal(items.filter((v)=>(v.owner === user && v.status==="Done")))));
        const barData = {
            "labels": this.state.userList,
            "datasets":[{
                "label": "Hours Committed",
                "data": userData,
                "color": "75,192,192",
            }, {
                "label": "Hours Done",
                "data": userDoneData,
                "color": "255,99,132",
            }],
            "onClick": this.onUserColumnClick,
        };
        this.setState({barData:barData, selectedGroupId:groupId, selectedGroupTitle:groupTitle});
    }

    componentDidMount() {
        initializeIcons();
        monday.listen("settings", res => {
            this.setState({ settings: res.data });
        });
      
        monday.listen("context", res => {
            this.setState({context: res.data});
            monday.api(`query ($boardIds: [Int]) { boards (ids:$boardIds) { name items {name id group { id } updates {text_body created_at} column_values { title text } } top_group { id title }  groups { id title } } }`,
                { variables: {boardIds: this.state.context.boardIds} }
            )
            .then(res => {
                console.log(res.data );
                this.setState({boardData: res.data});
                this.updateChartData(res.data.boards[0].top_group.id, res.data.boards[0].top_group.title);
            });
        })
    }

    rowData = (props) => {
        return (
            <div style={{width: props.rowWidth, height: props.rowHeight, display: "flex"}}>
                <div style={{width: "80%"}}>{props.title}</div>
                <div style={{width: "20%"}}>{props.value}</div>
            </div>
        );
    }
    
    renderInvoiceData = () => {
        const tot = this.getTotal(this.getItems(this.state.selectedGroupId)
                                  .filter((v)=>(v.owner === this.state.selectedUser && v.status==="Done")));
        const hourlyRate = this.state.settings.hourlyRate || 1;
        const cost = tot*hourlyRate;
        const renderData = [
            {
                "title": "Total hours spent",
                "value": `: ${tot}`,
            },
            {
                "title": "Hourly rate ($)",
                "value": `: ${hourlyRate}`,
            },
            {
                "title": "Total amount ($)",
                "value": `: ${cost}`,
            },
        ];
        return (
            <div style={{width: "200px", marginTop: "20px"}}>
            {renderData.map((v)=>(this.rowData({...v,"rowWidth": "100%", "rowHeight": "20px"})))}
            </div>
        );
    }

    onGroupSelect = (ev, val)=>{
        this.updateChartData(val.key, val.text);
    }
    onBackClicked = ()=>{
        this.setState({viewState: "board"});
    }

    render() {
        const menuProps = {
            items: [
                {
                    key: 'downloadPDF',
                    text: 'Download PDF',
                    onClick: () => exportComponentAsPDF(this.componentRef, `${this.state.selectedGroupTitle}.pdf`),
                },
                {
                    key: 'downloadJPEG',
                    text: 'Download JPEG',
                    onClick: () => exportComponentAsJPEG(this.componentRef, `${this.state.selectedGroupTitle}.jpeg`),
                },
                {
                    key: 'downloadPNG',
                    text: 'Download PNG',
                    onClick: () => exportComponentAsPNG(this.componentRef, `${this.state.selectedGroupTitle}.png`),
                }
            ],
        };
        let options = undefined;
        if (this.state.boardData) {
            options = this.state.boardData.boards[0].groups.map((v)=>({"key":v.id,"text":v.title}));
        }
        const dragOptions = {
            moveMenuItemText: 'Move',
            closeMenuItemText: 'Close',
            menu: ContextualMenu,
        };


        return (
            <div
                className="App"
            >
            { options && this.state.viewState === "board" &&
                <Dropdown
                    placeholder="Select an option"
                    label="Group for which burndown chart is to be displayed"
                    defaultSelectedKey={this.state.selectedGroupId}
                    options={options}
                    styles={dropdownStyles}
                    onChange={this.onGroupSelect}
                />
            }
            { this.state.viewState === "user" && 
                <DefaultButton
                    iconProps={{ iconName: 'NavigateBack' }}
                    text="Go Back"
                    onClick={this.onBackClicked}
                    allowDisabledFocus
                />
            }
            <div style={{background: (this.state.settings.background || "white"), height: "70%", marginTop: 10}} ref={this.componentRef}>
            {this.state.viewState === "board" && this.state.barData && <BarGraph data={this.state.barData}/>}
            {this.state.viewState === "user" &&this.state.userLineData && <LineGraph data={this.state.userLineData}/>}
            </div>
            {(this.state.viewState === "board" || this.state.settings.shouldDisableInvoice ) && this.state.barData && 
                <CommandBarButton
                    iconProps={{ iconName: 'Download' }}
                    text="Download this chart"
                    checked={true}
                    menuProps={menuProps}
                    styles={buttonStyles}
                />
            }
            { this.state.viewState === "user" && !this.state.settings.shouldDisableInvoice &&
                <div>
                    <DefaultButton onClick={()=>this.setState({isModalOpen:true})} text="Generate invoice" style={{marginTop:20}} />
                    <Modal
                        isOpen={this.state.isModalOpen}
                        onDismiss={()=>this.setState({isModalOpen:false})}
                        isBlocking={false}
                        containerClassName={containerStyles}
                        dragOptions={dragOptions}
                    >
                        <div style={{margin: "20px 20px 20px 20px"}}>
                        {this.state.userLineData &&
                         <div ref = {this.userComponentRef}>
                            <h1 style={{color:"blue"}}>Invoice for {this.state.selectedUser}</h1>
                            <div >
                                <LineGraph data={this.state.userLineData}/>
                            </div>
                            {this.renderInvoiceData()}
                         </div>
                        }
                        {this.state.userLineData &&
                            <DefaultButton
                                style={{marginTop:20}}
                                iconProps={{ iconName: 'Download' }}
                                text="Download invoice"
                                onClick={() => exportComponentAsPDF(this.userComponentRef, `${this.state.selectedUser} invoice.pdf`)}
                                allowDisabledFocus
                            />
                        }
                         </div>
                    </Modal>

                </div>
            }
            </div>
        );
    }
}

export default App;
