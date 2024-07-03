import { PORT, app } from "./index.js";

// import { sequelize } from "./libs/db.js";
// import Clause from "./models/data.model.js";
// import Table from "./models/table.model.js";

(async () => {
  try {
    // await sequelize.authenticate();
    // const tableExists = await sequelize.getQueryInterface().showAllTables()
    // if (!tableExists.includes("Clause")) {
    //   await Clause.sync()
    //   console.log("🛢️: Clause Database initialized")
    // } else if (!tableExists.includes("Table")) {
    //   await Table.sync()
    //   console.log("🛢️: Table Database initialized")
    // } else {
    //   console.log('🛢️: Database already initialized')
    // }

    // await sequelize.sync();
    // console.log("💾 Database connected");
    app.listen(PORT, () => {
      console.log("🚀 Server is running on port:", PORT);
    });
  } catch (error) {
    console.error("Error: ⛔ ", error.message);
  }
})();
