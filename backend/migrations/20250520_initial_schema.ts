import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema
    // Media items table
    .createTable('media_items', function(table) {
      table.uuid('id').defaultTo(knex.raw('gen_random_uuid()')).primary();
      table.enu('type', ['image', 'video'], { useNative: true, enumName: 'media_type' }).notNullable();
      table.string('url').notNullable();
      table.string('thumbnail_url');
      table.string('uploader_name').notNullable();
      table.text('description').notNullable();
      table.timestamp('created_at').defaultTo(knex.fn.now()).notNullable();
      table.timestamp('updated_at').defaultTo(knex.fn.now()).notNullable();
    })
    
    // Comments table
    .createTable('comments', function(table) {
      table.uuid('id').defaultTo(knex.raw('gen_random_uuid()')).primary();
      table.uuid('media_id').notNullable().references('id').inTable('media_items').onDelete('CASCADE');
      table.string('author').notNullable();
      table.text('content').notNullable();
      table.timestamp('created_at').defaultTo(knex.fn.now()).notNullable();
      table.timestamp('updated_at').defaultTo(knex.fn.now()).notNullable();
    });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema
    .dropTable('comments')
    .dropTable('media_items')
    .raw('DROP TYPE IF EXISTS media_type');
}
