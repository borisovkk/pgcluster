import React, { Component } from 'react'
import ConnectedStatus from '../../shared/components/ConnectedStatus'


const Backend = ( {backend} ) => {

	let color= backend.status === 'up'  ? '#89C35C' : 'red';

	return (
		<svg width="210" height="100">
			
			<rect width={200} height={100} style={{fill : color}} />
			<text x={10} y={40} style={{fontSize: '80%'}} fill='black'>
				ID: {backend.idx} - State: {backend.status} 
			</text>
		</svg>
	)
}

class DBStates extends Component{

	constructor(props){
		super(props);
		this.state = {'serverTimeStamp': null, 'connected': false};
		this.renderContent = this.renderContent.bind(this);
	}

	componentDidMount(){
		//this.props.fetchPgpool();
    const protocolPrefix = (window.location.protocol === 'https:') ? 'wss:' : 'ws:';
    let host = window.location.host;
    if (!process.env.NODE_ENV || process.env.NODE_ENV === 'development') {
      host = 'localhost:8080';
    }
    this.ws = new WebSocket(protocolPrefix + '//' + host + '/ws/dbstates');
 	
    this.ws.onopen = () => {
      console.log('ws onopen, set state to connected');
      this.setState({'connected': true});
      this.ws.send('I just connected');
      this.ws.onmessage = e => {
        console.log('on message');
      	let result = JSON.parse(e.data);
        this.setState({'serverTimeStamp': result.timestamp});
        if (result && result.error ){
          this.props.fetchDBStatesFailure(result.message || 'server error');
        } else {
          this.props.fetchDBStatesSuccess(result.result);
        }
      }
    };

    this.ws.onerror = e => {
    	console.log('on error');
      console.log(e);
    	this.setState({ error: 'WebSocket error' , 'connected': false});
      this.props.fetchDBStatesFailure('websocker error !');
    }
    
    this.ws.onclose = e => !e.wasClean && this.setState({ error: `WebSocket error: ${e.code} ${e.reason}`, 'connected': false });
	
	}

	componentWillUnmount() {
    this.ws.close()
  }

	renderContent(){
		if (this.props.error){
			return (<div className="alert alert-danger">{this.props.error}</div>);
		}
    if (! this.state.connected){
      return (<div className="alert alert-danger">Disconnected from server</div>)
    }
		if (this.props.rows.length === 0){
			return (<div className="loader"></div>);
		}
		let content = this.props.rows.map((el,idx)=>{

			return(
				<Backend key={el.idx} backend={el} />
			)
		});
		return content;
	}

	render(){

		return (
			<div className="panel panel-default">
				<div className="panel-heading">
					Database back-ends <ConnectedStatus serverTimeStamp={this.state.serverTimeStamp} connected={this.state.connected} />
				</div>
				<div className="panel-body">
					{this.renderContent()}
				</div>
			</div>
		)
	}
}

export default DBStates