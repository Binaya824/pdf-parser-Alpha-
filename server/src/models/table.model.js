// import { DataTypes, Model, Sequelize } from "sequelize";

// import { sequelize } from "../libs/db.js";
// import Clause from "./data.model.js";

// class Table extends Model { }

// Table.init(
//     {
//         id: {
//             type: DataTypes.UUID,
//             defaultValue: DataTypes.UUIDV4,
//             primaryKey: true,
//             allowNull: false,
//         },
//         data: {
//             type: DataTypes.JSONB,
//             get() {
//                 return JSON.parse(this.getDataValue("data"));
//             },
//             set(value) {
//                 return this.setDataValue("data", JSON.stringify(value));
//             },
//         },
//         // documentId: {
//         //     type: DataTypes.UUID
//         // }
//     },
//     {
//         sequelize,
//         modelName: "Table",
//         freezeTableName: true,
//         timestamps: true,
//     }
// );

// // Table.hasOne(Clause)

// (async () => {
//     await Table.sync();
// })();

// // module.exports = Table;
// export default Table