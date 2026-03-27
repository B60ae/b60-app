fetch('http://localhost:3001/api/menu/items')
  .then(r => r.json())
  .then(data => {
    console.log("ITEM COUNT:", data.length);
    if(data.length > 0) {
       console.log("FIRST ITEM:", data[0].name, "| IMAGE:", data[0].image_url);
    }
  }).catch(e => console.error(e));
