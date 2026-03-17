let reports=loadReports()

function createReport(data){

data.time=new Date()

reports.push(data)

saveReports(reports)

return data

}

function formatReport(r){

return `Count: ${r.count}

Location: ${r.location}

Equipment: ${r.equipment}

Actions: ${r.actions}

Report Time: ${new Date(r.time).toLocaleTimeString()}`

}