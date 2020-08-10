import React from "react";
import {Line, Bar} from 'react-chartjs-2';

export function LineGraph(props) {
  const data = {
  labels: props.data.labels,
  datasets: props.data.datasets.map((val)=>(
    {
      label: val.label,
      fill: false,
      lineTension: 0.1,
      backgroundColor: 'rgba(75,192,192,0.4)',
      borderColor: 'rgba(75,192,192,1)',
      borderCapStyle: 'butt',
      borderDash: [],
      borderDashOffset: 0.0,
      borderJoinStyle: 'miter',
      pointBorderColor: 'rgba(75,192,192,1)',
      pointBackgroundColor: '#fff',
      pointBorderWidth: 1,
      pointHoverRadius: 5,
      pointHoverBackgroundColor: 'rgba(75,192,192,1)',
      pointHoverBorderColor: 'rgba(220,220,220,1)',
      pointHoverBorderWidth: 2,
      pointRadius: 1,
      pointHitRadius: 10,
      data: val.data
    })),
  };
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      yAxes: [{
        ticks: {
          beginAtZero: true,
          min: 0
        }
      }]
    }
  };

  return (<Line data={data} options={options}/>);
}

export function BarGraph(props) {
    const data = {
        labels: props.data.labels,
        datasets: props.data.datasets.map((val)=>(
            {
                label: val.label,
                backgroundColor: `rgba(${val.color},0.2)`,
                borderColor: `rgba(${val.color},1)`,
                borderWidth: 1,
                hoverBackgroundColor: `rgba(${val.color},0.4)`,
                hoverBorderColor: `rgba(${val.color},1)`,
                maxBarThickness: 50,
                data: val.data
            })),
    };
    const options = {
        responsive: true,
        maintainAspectRatio: false,
        onClick: props.data.onClick,
        scales: {
            yAxes: [{
                ticks: {
                    beginAtZero: true,
                    min: 0
                }
            }]
        }
    };

    return (<Bar data={data} options={options}/>);
}