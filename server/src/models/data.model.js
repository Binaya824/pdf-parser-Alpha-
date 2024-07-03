// import { DataTypes, Model, Sequelize } from "sequelize";

// import { sequelize } from "../libs/db.js";

// class Clause extends Model { }

// Clause.init(
//   {
//     id: {
//       type: DataTypes.UUID,
//       defaultValue: DataTypes.UUIDV4,
//       primaryKey: true,
//       allowNull: false,
//     },
//     data: {
//       type: DataTypes.JSONB,
//       get() {
//         return JSON.parse(this.getDataValue("data"));
//       },
//       set(value) {
//         return this.setDataValue("data", JSON.stringify(value));
//       },
//     },
//     tableId: {
//       type: DataTypes.UUID
//     }
//   },
//   {
//     sequelize,
//     modelName: "Clause",
//     freezeTableName: true,
//     timestamps: true,
//   }
// );

// (async () => {
//   await Clause.sync();
// })();

// export default Clause
