
// import { DataTypes, Model, Sequelize } from "sequelize";

// import { sequelize } from "../libs/db.js";

// class Files extends Model { }

// Files.init(
//     {
//         id: {
//             type: DataTypes.UUID,
//             defaultValue: DataTypes.UUIDV4,
//             primaryKey: true,
//             allowNull: false,

//         },
//         folder_id:{
//             type:DataTypes.INTEGER
//         },
//         data: {
//             type: DataTypes.JSONB,
//         },
//         // documentId: {
//         //     type: DataTypes.UUID
//         // }
//     },
//     {
//         sequelize,
//         modelName: "Files",
//         freezeTableName: true,
//         timestamps: true,
//     }
// );

// // Files.hasOne(Clause)

// (async () => {
//     await Files.sync();
// })();

// // module.exports = Files;
// export default Files