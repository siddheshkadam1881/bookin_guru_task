# bookin_guru_task
ENV file not commenting for right now to understanding purpose.


1) required all modules using npm i command 

2) then use start npm command to start backend

3) call backend REST API url post method 

  'method': 'POST',
  'url': 'http://localhost:5000/pollution-data',
  'headers': {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    "country": "FR",
    "page": 1,
    "limit": 50
  })







