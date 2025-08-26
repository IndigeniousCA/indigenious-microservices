exports.up = function(knex) {
  return knex.schema.createTable('rfq_invitations', function(table) {
    table.uuid('id').primary();
    table.uuid('rfq_id').references('id').inTable('rfqs').onDelete('CASCADE');
    table.string('business_id').notNullable(); // Business being invited
    table.string('invited_by').notNullable(); // User who sent the invitation
    table.text('custom_message');
    table.string('status').defaultTo('sent'); // sent, accepted, declined, expired
    table.text('response_message');
    table.timestamp('invited_at').defaultTo(knex.fn.now());
    table.timestamp('responded_at');
    table.timestamp('expires_at').notNullable();
    table.timestamps(true, true);

    // Indexes
    table.index(['rfq_id']);
    table.index(['business_id']);
    table.index(['status']);
    table.index(['invited_at']);
    table.index(['expires_at']);

    // Unique constraint to prevent duplicate invitations
    table.unique(['rfq_id', 'business_id']);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('rfq_invitations');
};