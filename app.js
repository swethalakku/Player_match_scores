const express = require("express");
const app = express();
app.use(express.json());
const path = require("path");

const { open } = require("sqlite");
const sqlite3 = require("sqlite3");

const dbPath = path.join(__dirname, "cricketMatchDetails.db");

let db = null;

const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server Running at http://localhost:3000/");
    });
  } catch (e) {
    console.log(`DB Error: ${e.message}`);
    process.exit(1);
  }
};
initializeDBAndServer();

const convertPlayerDetailsDbObjectToResponseObject = (dbObject) => {
  return {
    playerId: dbObject.player_id,
    playerName: dbObject.player_name,
  };
};
const convertMatchDetailsDbObjectToResponseObject = (dbObject) => {
  return {
    matchId: dbObject.match_id,
    match: dbObject.match,
    year: dbObject.year,
  };
};
const convertPlayerMatchScoreDetailsDbObjectToResponseObject = (dbObject) => {
  return {
    playerMatchId: dbObject.player_match_id,
    playerId: dbObject.player_id,
    matchId: dbObject.match_id,
    score: dbObject.score,
    fours: dbObject.fours,
    sixes: dbObject.sixes,
  };
};

app.get("/players/", async (request, response) => {
  const getPlayersQuery = `
        SELECT * 
        FROM player_details`;
  const playersArray = await db.all(getPlayersQuery);
  response.send(
    playersArray.map((eachPlayer) =>
      convertPlayerDetailsDbObjectToResponseObject(eachPlayer)
    )
  );
});

//Get Player API
app.get("/players/:playerId/", async (request, response) => {
  const { playerId } = request.params;
  const getPlayerQuery = `
        SELECT *
        FROM player_details
        WHERE player_id = ${playerId}`;
  const player = await db.get(getPlayerQuery);
  response.send(convertPlayerDetailsDbObjectToResponseObject(player));
});

//Update Player API
app.put("/players/:playerId/", async (request, response) => {
  const { playerId } = request.params;
  const { playerName } = request.body;
  const updatePlayerQuery = `
        UPDATE player_details
        SET 
            player_name = '${playerName}'
        WHERE player_id = ${playerId}`;
  await db.run(updatePlayerQuery);
  response.send("Player Details Updated");
});

//Get Match API
app.get("/matches/:matchId/", async (request, response) => {
  const { matchId } = request.params;
  const getMatchQuery = `
        SELECT *
        FROM match_details
        WHERE match_id = ${matchId}`;
  const match = await db.get(getMatchQuery);
  response.send(convertMatchDetailsDbObjectToResponseObject(match));
});

//Get All Matches of Player API
app.get("/players/:playerId/matches", async (request, response) => {
  const { playerId } = request.params;
  const getMatchesOfPlayerQuery = `
        SELECT *
        FROM player_match_score
        NATURAL JOIN match_details
        WHERE player_id = ${playerId}`;
  const matchesOfPlayer = await db.all(getMatchesOfPlayerQuery);
  response.send(
    matchesOfPlayer.map((eachMatch) =>
      convertMatchDetailsDbObjectToResponseObject(eachMatch)
    )
  );
});

//Get players API
app.get("/matches/:matchId/players", async (request, response) => {
  const { matchId } = request.params;
  const getPlayersQuery = `
        SELECT *
        FROM player_match_score
        NATURAL JOIN player_details 
        WHERE match_id = ${matchId}`;
  const matchPlayers = await db.all(getPlayersQuery);
  response.send(
    matchPlayers.map((eachPlayer) =>
      convertPlayerDetailsDbObjectToResponseObject(eachPlayer)
    )
  );
});

//Get Statistics of Player API
app.get("/players/:playerId/playerScores", async (request, response) => {
  const { playerId } = request.params;
  const getStatisticsOfPlayerQuery = `
        SELECT player_details.player_id AS playerId,
            player_details.player_name AS playerName,
            SUM(player_match_score.score) AS totalScore,
            SUM(player_match_score.fours) AS totalFours,
            SUM(player_match_score.sixes) AS totalSixes
        FROM player_match_score INNER JOIN player_details
            ON player_details.player_id = player_match_score.player_id
        WHERE player_details.player_id = ${playerId}`;
  const statisticsOfPlayer = await db.get(getStatisticsOfPlayerQuery);
  response.send(statisticsOfPlayer);
});

module.exports = app;
