import express from 'express'
import axios from 'axios'
import bodyParser from 'body-parser';
import pg from 'pg';
import env from "dotenv"
import passport from 'passport';
import bcrypt from "bcrypt"
import session from 'express-session';

const app = express();
const port = 3000;
const saltrounds = 10;
env.config();

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
  })
);

const url = "https://graphql.anilist.co";
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

app.use(passport.initialize());
app.use(passport.session());

const db = new pg.Client({
  user: process.env.PG_USER,
  host: process.env.PG_HOST,
  password:  process.env.PG_PASSWORD,
  database: process.env.PG_DATABASE,
  port: process.env.PG_PORT,
});

db.connect()

let watched_anime = [];

app.get("/", (req, res) => {
    res.render("index.ejs");
});


app.get("/anime/list/:query", async (req, res) => {
    const query = req.params.query;
    try {
        let data;
        if (!isNaN(query)) {
            data = await fetchAnimeById(parseInt(query));
        } else {
            data = await fetchAnimeByName(query);
        }
        if (!data) {
            res.render('searchresult.ejs', {
                anime: null
            })
        }
        else {
            res.render('searchresult.ejs', {
                anime: data
            })
        }
    } catch (error) {
        console.log("Error fetching anime:", error.message);
        res.status(500).send("Server error while fetching anime.");
    }
});

app.get("/anime/:query", async (req, res) => {
       const query = parseInt(req.params.query);
    console.log(query)
    try {
        let data = await fetchAnimeById(query);
        res.render('animepage.ejs',{
            anime : data
        })
    } catch (error) {
        console.log("Error fetching anime:", error.message);
        res.status(500).send("Server error while fetching anime.");
    }
});

app.get("/login", async (req,res)=>{
    res.render("login.ejs")
})
app.get("/register", (req, res) => {
  res.render("register.ejs");
});

app.post("/register", async (req,res)=>{
    const email = req.body.email;
    const password = req.body.password;

    try {
       const check_user = await db.query("SELECT * FROM users WHERE email = $1",[email]);
       if(check_user.rows.length > 0){
        res.redirect("/login");
       }
       else{
        await db.query("INSERT INTO users (email,password) VALUES ($1,$2)", [email,password]);
        console.log("user registered successfully");
        res.redirect("/");
        }
    } catch (error) {
    console.log(error);
    }

})

app.post("/login", async (req,res)=>{
    const email = req.body.email;
    const password = req.body.password;

    try {
       const check_user = await db.query("SELECT * FROM users WHERE email = $1 AND password = $2",[email,password]);
       if(check_user.rows.length > 0){
     console.log("user login successfully");
       }
       else{
       console.log("user not found");
        res.redirect("/register");
        }
    } catch (error) {
    console.log(error);
    }

})

app.post("/searchanime", async (req, res, next) => {
    const { search, animeId, animeName } = req.body;
    if (search === 'animeId') {
        res.redirect(`/anime/list/${animeId}`);
    }
    else if (search === 'animeName') {
        res.redirect(`/anime/list/${animeName}`);
    }
    else {
        return res.status(400).send("Invalid action");
    }
})


app.post("/add", async (req, res, next) => {
    try {
        const anime_Id = req.body; 
        const result = await db.query("SELECT anime_id FROM watched_anime");
        let watched_anime = result.rows.map((anime) => anime.anime_id);
        console.log(anime_Id);
        const check_anime = await db.query("SELECT anime_id FROM watched_anime WHERE anime_id = $1", [anime_Id.animeId]);
        console.log(check_anime.rows);
        if (check_anime.rows.length > 0) {
            console.log("Anime already exists in watched list:", check_anime.rows);
            return res.status(200)
        } else {
            await db.query("INSERT INTO watched_anime (anime_id) VALUES ($1)", [anime_Id.animeId]); 
            console.log("Successfully inserted", anime_Id.animeId);
        }

            res.redirect(`/anime/${anime_Id.animeId}`);

    } catch (error) {
        console.error("Error handling /add request:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
});

const fetchAnimeByName = async (animeName) => {
    const query = `
   query ($search: String) {
   Page(perPage: 20){
  media(search: $search, type: ANIME) {
    id
    title {
      romaji
      english
      native
    }
    coverImage{
      extraLarge
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
}}
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
        console.log(response.data.data.Page.media)
        return response.data.data.Page.media;
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

