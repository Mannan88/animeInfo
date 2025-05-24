import express from 'express'
import axios from 'axios'
import bodyParser from 'body-parser';

const app = express();
const port = 3000;
const url = "https://graphql.anilist.co";
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

app.get("/", (req, res) => {
    res.render("index.ejs");
});

app.get("/anime/:query", async (req, res) => {
    const query = req.params.query;
    try {
        let data;
        if (!isNaN(query)) {
            data = await fetchAnimeById(parseInt(query));
        } else {
            data = await fetchAnimeByName(query);
        }
        if (!data) {
            res.render('partials/animepage.ejs', {
                anime: null
            })
        }
        else {
            res.render('partials/animepage.ejs', {
                anime: data
            })
        }
    } catch (error) {
        console.log("Error fetching anime:", error.message);
        res.status(500).send("Server error while fetching anime.");
    }
});


app.post("/searchanime", async (req, res, next) => {
    const { search, animeId, animeName } = req.body;
    if (search === 'animeId') {
        res.redirect(`/anime/${animeId}`);
    }
    else if (search === 'animeName') {
        res.redirect(`/anime/${animeName}`);
    }
    else {
        return res.status(400).send("Invalid action");
    }
})

const fetchAnimeByName = async (animeName) => {
    const query = `
   query ($search: String) {
  Media(search: $search, type: ANIME) {
    id
    title {
      romaji
      english
      native
    }
    coverImage{
      large
      medium
    }
    description,
    episodes,
    studios{
      edges{
         node{
           id
           name
          }
        } 
    }
  }
}`
    const variables = {
        search: animeName
    };
    console.log("Sending request with:", JSON.stringify({ query, variables }, null, 2));
    try {

        const response = await axios.post(url, {
            query: query,
            variables: variables
        }, {
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        });
        console.log(response.data.data.Media)
        return response.data.data.Media;
    } catch (error) {
        console.error("Error fetching data:", error.response?.data || error.message);
    }
}

const fetchAnimeById = async (id) => {
    const query = `
query ($id: Int) {
  Media(id: $id, type: ANIME) {
    id
    title {
      romaji
      english
      native
    }
    coverImage{
      large
      medium
    }
      
    description,
    episodes,
    studios{
      edges{
         node{
           id
           name
          }
        } 
    }
  }
}`;
    const variables = {
        id: id
    };
    try {
        const response = await axios.post(url, {
            query: query,
            variables: variables
        }, {
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        });
        console.log(response.data.data.Media)
        return response.data.data.Media;
    } catch (error) {
        console.log("error fetching data", error);
    }
};

app.listen(port, () => {
    console.log(`app is running on port ${port}`)
});

